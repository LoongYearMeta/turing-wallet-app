import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { fetchUTXOs } from '@/actions/get-utxos';
import { sendTbc } from '@/lib/tbc';
import { calculateFee } from '@/lib/util';
import { Transaction } from '@/types';
import { retrieveKeys } from '@/utils/key';
import type { FT, FTHistory } from '@/utils/sqlite';
import { database } from '@/utils/sqlite';
import { store } from '@/utils/store';

export const sendFT = async (
	contractId: string,
	address_from: string,
	address_to: string,
	ft_amount: number,
	password: string,
): Promise<Transaction> => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const Token = new contract.FT(contractId);
		const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
		Token.initialize(TokenInfo);
		const transferTokenAmountBN = BigInt(Math.floor(ft_amount * Math.pow(10, Token.decimal)));
		const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
			.toBuffer()
			.toString('hex');
		let ftutxos: tbc.Transaction.IUnspentOutput[] = [];
		try {
			ftutxos = await contract.API.fetchFtUTXOs(
				Token.contractTxid,
				address_from,
				ftutxo_codeScript,
				'mainnet',
				transferTokenAmountBN,
			);
		} catch (error: any) {
			if (error.message.includes('Insufficient FTbalance, please merge FT UTXOs')) {
				try {
					await mergeFT(contractId, address_from, password);
				} catch (error: any) {
					throw new Error(error.message);
				}
			} else {
				throw new Error(error.message);
			}
		}
		if (ftutxos.length === 0) {
			ftutxos = await contract.API.fetchFtUTXOs(
				Token.contractTxid,
				address_from,
				ftutxo_codeScript,
				'mainnet',
				transferTokenAmountBN,
			);
		}
		let preTXs: tbc.Transaction[] = [];
		let prepreTxDatas: string[] = [];
		for (let i = 0; i < ftutxos.length; i++) {
			preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId));
			prepreTxDatas.push(await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex));
		}
		const utxo = await getUTXO(address_from, 0.01, password);
		let txHex = '';
		if (address_to.startsWith('1')) {
			txHex = Token.transfer(
				privateKey,
				address_to,
				ft_amount,
				ftutxos,
				utxo,
				preTXs,
				prepreTxDatas,
			);
		} else {
			txHex = contract.MultiSig.p2pkhToMultiSig_transferFT(
				address_from,
				address_to,
				Token,
				ft_amount,
				utxo,
				ftutxos,
				preTXs,
				prepreTxDatas,
				privateKey,
			);
		}

		return {
			txHex,
			fee: calculateFee(txHex),
			address_to,
			utxos: [utxo].map((u) => ({
				...u,
				height: 0,
				isSpented: false,
			})),
		};
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const transferFT_multiSig_create = async (
	contractId: string,
	address_from: string,
	address_to: string,
	ft_amount: number,
	password: string,
) => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const script_asm = contract.MultiSig.getMultiSigLockScript(address_from);
		const umtxo = await contract.API.fetchUMTXO(script_asm, 'mainnet');
		const Token = new contract.FT(contractId);
		const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid, 'mainnet');
		Token.initialize(TokenInfo);
		const transferTokenAmountBN = BigInt(Math.floor(ft_amount * Math.pow(10, Token.decimal)));
		const hash_from = tbc.crypto.Hash.sha256ripemd160(
			tbc.crypto.Hash.sha256(tbc.Script.fromASM(script_asm).toBuffer()),
		).toString('hex');
		const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, hash_from)
			.toBuffer()
			.toString('hex');
		const ftutxos = await contract.API.fetchFtUTXOS_multiSig(
			Token.contractTxid,
			hash_from,
			ftutxo_codeScript,
			transferTokenAmountBN,
			'mainnet',
		);
		let preTXs: tbc.Transaction[] = [];
		let prepreTxDatas: string[] = [];
		for (let i = 0; i < ftutxos.length; i++) {
			preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId, 'mainnet'));
			prepreTxDatas.push(
				await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex, 'mainnet'),
			);
		}
		const contractTX = await contract.API.fetchTXraw(umtxo.txId, 'mainnet');
		const multiSigTxraw = contract.MultiSig.buildMultiSigTransaction_transferFT(
			address_from,
			address_to,
			Token,
			ft_amount,
			umtxo,
			ftutxos,
			preTXs,
			prepreTxDatas,
			contractTX,
			privateKey,
		);
		const sigs = contract.MultiSig.signMultiSigTransaction_transferFT(
			address_from,
			Token,
			multiSigTxraw,
			privateKey,
		);
		return { multiSigTxraw, sigs };
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const transferFT_multiSig_sign = async (
	contractId: string,
	multiSigAddress: string,
	multiSigTxraw: contract.MultiSigTxRaw,
	password: string,
): Promise<string[]> => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const Token = new contract.FT(contractId);
		const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid, 'mainnet');
		Token.initialize(TokenInfo);
		const sigs = contract.MultiSig.signMultiSigTransaction_transferFT(
			multiSigAddress,
			Token,
			multiSigTxraw,
			privateKey,
		);
		return sigs;
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const transferFT_multiSig_finish = async (
	multiSigTxraw: contract.MultiSigTxRaw,
	sigs: string[][],
	pubKeys: string[],
) => {
	try {
		const txraw = contract.MultiSig.finishMultiSigTransaction_transferFT(
			multiSigTxraw.txraw,
			sigs,
			pubKeys,
		);
		const txId = await contract.API.broadcastTXraw(txraw, 'mainnet');
		if (txId) {
			return txId;
		} else {
			throw new Error('Failed to broadcast transaction.');
		}
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const mergeFT = async (contractId: string, address_from: string, password: string) => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const Token = new contract.FT(contractId);
		const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
		Token.initialize(TokenInfo);
		const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
			.toBuffer()
			.toString('hex');
		for (let i = 0; i < 10; i++) {
			const utxo = await getUTXO(address_from, 0.01, password);
			const ftutxos = await contract.API.fetchFtUTXOs(
				Token.contractTxid,
				address_from,
				ftutxo_codeScript,
			);
			let preTXs: tbc.Transaction[] = [];
			let prepreTxDatas: string[] = [];
			for (let i = 0; i < ftutxos.length; i++) {
				preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId));
				prepreTxDatas.push(
					await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex),
				);
			}
			const txHex = Token.mergeFT(privateKey, ftutxos, utxo, preTXs, prepreTxDatas);
			if (txHex === true) break;
			const txId = await contract.API.broadcastTXraw(txHex as string);
			if (!txId) {
				throw new Error('Failed to merge FT UTXO!');
			}
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export async function getUTXO(
	address: string,
	tbc_amount: number,
	password: string,
): Promise<tbc.Transaction.IUnspentOutput> {
	try {
		const satoshis_amount = Math.floor(tbc_amount * 1e6);
		let utxos = store.getCurrentAccountUtxos();
		if (!utxos || utxos.length === 0) {
			throw new Error('The balance in the account is zero.');
		}
		let utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
		if (utxo_amount < satoshis_amount) {
			utxos = await fetchUTXOs(address);
			if (!utxos || utxos.length === 0) {
				throw new Error('The balance in the account is zero.');
			}
			await store.updateCurrentAccountUtxos(utxos);
			utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
			if (utxo_amount < satoshis_amount) {
				throw new Error('Insufficient balance.');
			}
		}
		const scriptPubKey = tbc.Script.buildPublicKeyHashOut(address).toBuffer().toString('hex');
		utxos.sort((a, b) => a.satoshis - b.satoshis);
		const largeUTXO = utxos.find((utxo) => utxo.satoshis >= satoshis_amount);
		if (largeUTXO) {
			return {
				txId: largeUTXO.txId,
				outputIndex: largeUTXO.outputIndex,
				satoshis: largeUTXO.satoshis,
				script: scriptPubKey,
			};
		} else {
			const { txHex, utxos, satoshis } = await sendTbc(address, address, tbc_amount, password);
			const txId = await contract.API.broadcastTXraw(txHex);
			if (txId) {
				let currentUtxos = store.getCurrentAccountUtxos();
				const updatedUtxos = currentUtxos!.map((utxo) => {
					const isSpent = utxos!.some(
						(spentUtxo) =>
							spentUtxo.txId === utxo.txId && spentUtxo.outputIndex === utxo.outputIndex,
					);
					return isSpent ? { ...utxo, isSpented: true } : utxo;
				});

				await store.updateCurrentAccountUtxos(updatedUtxos);

				const newUtxo = {
					txId,
					outputIndex: 0,
					satoshis: satoshis!,
					script: scriptPubKey,
				};
				const storedUtxo = {
					...newUtxo,
					height: 0,
					isSpented: false,
				};

				await store.updateCurrentAccountUtxos([...updatedUtxos, storedUtxo]);

				return newUtxo;
			} else {
				throw new Error('Failed to merge UTXO.');
			}
		}
	} catch (error: any) {
		throw new Error(error.message);
	}
}

export async function getAllFTs(
	userAddress: string,
	pagination?: { page: number; pageSize: number },
): Promise<FT[]> {
	try {
		return await database.getAllFTs(userAddress, pagination);
	} catch (error) {
		return [];
	}
}

export async function getFT(id: string, userAddress: string): Promise<FT | null> {
	try {
		return await database.getFT(id, userAddress);
	} catch (error) {
		return null;
	}
}

export async function transferFT(id: string, amount: number, userAddress: string): Promise<void> {
	try {
		await database.transferFT(id, amount, userAddress);
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Failed to transfer FT');
	}
}

export async function softDeleteFT(id: string, userAddress: string): Promise<void> {
	try {
		await database.softDeleteFT(id, userAddress);
	} catch (error) {
		throw new Error('Failed to delete FT');
	}
}

export async function upsertFT(ft: FT, accountAddress: string): Promise<void> {
	try {
		await database.upsertFT(ft, accountAddress);
	} catch (error) {
		throw new Error('Failed to save FT data');
	}
}

export async function addFTHistory(history: FTHistory): Promise<void> {
	try {
		await database.addFTHistory(history);
	} catch (error) {
		throw new Error('Failed to add FT history');
	}
}

export async function getFTHistoryByContractId(
	contractId: string,
	pagination?: { page: number; pageSize: number },
): Promise<FTHistory[]> {
	try {
		return await database.getFTHistoryByContractId(contractId, pagination);
	} catch (error) {
		return [];
	}
}

export async function getFTHistoryById(id: string): Promise<FTHistory | null> {
	try {
		return await database.getFTHistoryById(id);
	} catch (error) {
		return null;
	}
}

export async function removeFT(id: string, userAddress: string): Promise<void> {
	try {
		await database.removeFT(id, userAddress);
	} catch (error) {
		throw new Error('Failed to remove FT');
	}
}

export async function getActiveFTs(
	userAddress: string,
	pagination?: { page: number; pageSize: number },
): Promise<FT[]> {
	try {
		return await database.getActiveFTs(userAddress, pagination);
	} catch (error) {
		return [];
	}
}
