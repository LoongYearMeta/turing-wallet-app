import { useCallback } from 'react';
import * as bitcoin from 'bitcoinjs-lib';
import axios from 'axios';

import { createFromWIF } from '@/lib/taproot';
import { useAccount } from '@/hooks/useAccount';
import { retrieveKeys } from '@/lib/key';

interface UTXO {
	txid: string;
	vout: number;
	value: number;
	address: string;
}

export const useBtcTransaction = () => {
	const getUTXOsFromBlockstream = useCallback(async (address: string): Promise<UTXO[]> => {
		const baseUrl = 'https://blockstream.info/api';

		try {
			const response = await axios.get(`${baseUrl}/address/${address}/utxo`);

			return response.data.map((utxo: any) => ({
				txid: utxo.txid,
				vout: utxo.vout,
				value: utxo.value,
				address: address,
			}));
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(`Failed to get UTXOs: ${error.response.statusText}`);
			}
			throw error;
		}
	}, []);

	const getFeeRates = useCallback(async (): Promise<{
		fast: number;
		medium: number;
		slow: number;
	}> => {
		try {
			const response = await axios.get('https://mempool.space/api/v1/fees/recommended');
			return {
				fast: response.data.fastestFee,
				medium: response.data.halfHourFee,
				slow: response.data.economyFee,
			};
		} catch (error) {
			return {
				fast: 20,
				medium: 10,
				slow: 5,
			};
		}
	}, []);

	const getTxHexBuffer = useCallback(async (txid: string): Promise<Buffer> => {
		const baseUrl = 'https://blockstream.info/api';

		try {
			const response = await axios.get(`${baseUrl}/tx/${txid}/hex`);
			return Buffer.from(response.data, 'hex');
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(`Failed to get transaction data: ${error.response.statusText}`);
			}
			throw error;
		}
	}, []);

	const selectOptimalUtxos = useCallback(
		(
			utxos: UTXO[],
			amount_btc: number,
			feeRateSatoshisPerByte: number,
		): { selectedUtxos: UTXO[]; totalInputAmount: number } => {
			const amountSatoshis = Math.floor(amount_btc * Math.pow(10, 8));
			const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
			const singleLargeUtxo = sortedUtxos.find((utxo) => {
				const estimatedSize = 1 * 180 + 2 * 34 + 10;
				const estimatedFee = Math.ceil(estimatedSize * feeRateSatoshisPerByte);
				return utxo.value >= amountSatoshis + estimatedFee;
			});

			if (singleLargeUtxo) {
				return {
					selectedUtxos: [singleLargeUtxo],
					totalInputAmount: singleLargeUtxo.value,
				};
			}

			let selectedUtxos: UTXO[] = [];
			let totalInputAmount = 0;
			const inputFee = Math.ceil(180 * feeRateSatoshisPerByte);
			const baseFee = Math.ceil((2 * 34 + 10) * feeRateSatoshisPerByte);
			let targetAmount = amountSatoshis + baseFee;

			for (const utxo of sortedUtxos) {
				if (utxo.value > inputFee) {
					selectedUtxos.push(utxo);
					totalInputAmount += utxo.value;
					targetAmount += inputFee;

					if (totalInputAmount >= targetAmount) {
						break;
					}
				}
			}

			return { selectedUtxos, totalInputAmount };
		},
		[],
	);

	const createTransaction_taproot = useCallback(
		async (
			recipientAddress: string,
			amount_btc: number,
			feeRateSatoshisPerByte: number,
			utxos: UTXO[],
			totalInputAmount: number,
			password: string,
		): Promise<string> => {
			const network = bitcoin.networks.bitcoin;
			const encryptedKeys = useAccount.getState().getEncryptedKeys();

			if (!encryptedKeys) {
				throw new Error('No keys found');
			}

			const { walletWif } = retrieveKeys(password, encryptedKeys);
			const keyPair = createFromWIF(walletWif);

			const amountSatoshis = Math.floor(amount_btc * Math.pow(10, 8));

			const psbt = new bitcoin.Psbt({ network });

			for (const utxo of utxos) {
				try {
					psbt.addInput({
						hash: utxo.txid,
						index: utxo.vout,
						nonWitnessUtxo: await getTxHexBuffer(utxo.txid),
					});
				} catch (error: any) {
					throw new Error(`${error.message}`);
				}
			}

			psbt.addOutput({
				address: recipientAddress,
				value: amountSatoshis,
			});

			const estimatedSize = utxos.length * 180 + 2 * 34 + 10;
			let estimatedFee = Math.ceil(estimatedSize * feeRateSatoshisPerByte);

			const maxFeeRatio = 0.5;
			let actualFeeRate = feeRateSatoshisPerByte;

			if (estimatedFee > amountSatoshis * maxFeeRatio) {
				actualFeeRate = Math.max(1, Math.floor(feeRateSatoshisPerByte / 2));

				const newEstimatedFee = Math.ceil(estimatedSize * actualFeeRate);

				estimatedFee = newEstimatedFee;
			}

			const changeAmount = totalInputAmount - amountSatoshis - estimatedFee;

			if (changeAmount < 0) {
				throw new Error(`Insufficient funds`);
			}

			if (changeAmount > 546) {
				const changeAddress = bitcoin.payments.p2pkh({
					pubkey: keyPair.publicKey,
					network,
				}).address!;

				psbt.addOutput({
					address: changeAddress,
					value: changeAmount,
				});
			}

			for (let i = 0; i < utxos.length; i++) {
				psbt.signInput(i, keyPair);
			}

			psbt.finalizeAllInputs();

			const tx = psbt.extractTransaction();

			return tx.toHex();
		},
		[getTxHexBuffer, selectOptimalUtxos],
	);

	const createTransaction_legacy = useCallback(
		async (
			recipientAddress: string,
			amount_btc: number,
			feeRateSatoshisPerByte: number,
			utxos: UTXO[],
			totalInputAmount: number,
			password: string,
		): Promise<string> => {
			const network = bitcoin.networks.bitcoin;
			const encryptedKeys = useAccount.getState().getEncryptedKeys();

			if (!encryptedKeys) {
				throw new Error('No keys found');
			}

			const { walletWif } = retrieveKeys(password, encryptedKeys);
			const keyPair = createFromWIF(walletWif);

			const amountSatoshis = Math.floor(amount_btc * Math.pow(10, 8));

			const psbt = new bitcoin.Psbt({ network });

			for (const utxo of utxos) {
				try {
					psbt.addInput({
						hash: utxo.txid,
						index: utxo.vout,
						nonWitnessUtxo: await getTxHexBuffer(utxo.txid),
					});
				} catch (error: any) {
					throw new Error(`${error.message}`);
				}
			}

			psbt.addOutput({
				address: recipientAddress,
				value: amountSatoshis,
			});

			const estimatedSize = utxos.length * 180 + 2 * 34 + 10;
			let estimatedFee = Math.ceil(estimatedSize * feeRateSatoshisPerByte);

			const maxFeeRatio = 0.5;
			let actualFeeRate = feeRateSatoshisPerByte;

			if (estimatedFee > amountSatoshis * maxFeeRatio) {
				actualFeeRate = Math.max(1, Math.floor(feeRateSatoshisPerByte / 2));

				const newEstimatedFee = Math.ceil(estimatedSize * actualFeeRate);

				estimatedFee = newEstimatedFee;
			}

			const changeAmount = totalInputAmount - amountSatoshis - estimatedFee;

			if (changeAmount < 0) {
				throw new Error(`Insufficient funds`);
			}

			if (changeAmount > 546) {
				const changeAddress = bitcoin.payments.p2pkh({
					pubkey: keyPair.publicKey,
					network,
				}).address!;

				psbt.addOutput({
					address: changeAddress,
					value: changeAmount,
				});
			}

			for (let i = 0; i < utxos.length; i++) {
				psbt.signInput(i, keyPair);
			}

			psbt.finalizeAllInputs();

			const tx = psbt.extractTransaction();

			return tx.toHex();
		},
		[getTxHexBuffer, selectOptimalUtxos],
	);

	const calculateTransactionFee = useCallback(
		(
			txHex: string,
			totalInputAmount: number,
		): {
			fee: number;
			feeRate: number;
			txSize: number;
			txVsize: number;
		} => {
			const tx = bitcoin.Transaction.fromHex(txHex);
			const totalOutputAmount = tx.outs.reduce((sum, output) => sum + output.value, 0);
			const fee = totalInputAmount - totalOutputAmount;
			const txSize = tx.byteLength();
			const txWeight = tx.weight();
			const txVsize = Math.ceil(txWeight / 4);
			const feeRate = Math.round((fee / txVsize) * 100) / 100;

			return {
				fee,
				feeRate,
				txSize,
				txVsize,
			};
		},
		[],
	);

	async function broadcastTransaction(txHex: string): Promise<string> {
		const baseUrl = 'https://blockstream.info/api';

		try {
			const response = await axios.post(`${baseUrl}/tx`, txHex);
			return response.data;
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(`Broadcast transaction failed: ${error.response.data}`);
			}
			throw error;
		}
	}

	return {
		getUTXOsFromBlockstream,
		getFeeRates,
		createTransaction_taproot,
		calculateTransactionFee,
		broadcastTransaction,
		createTransaction_legacy,
		selectOptimalUtxos,
	};
};
