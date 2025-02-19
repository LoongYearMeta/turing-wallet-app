import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { getUTXOs } from '@/actions/get-utxos';
import { calculateFee } from '@/lib/util';
import { Transaction } from '@/types';
import { retrieveKeys } from '@/utils/key';

export const sendTbc = async (
	address_from: string,
	receive_address: string,
	tbc_amount: number,
	password: string,
): Promise<Transaction> => {
	try {
		const satoshis_amount = Math.floor(tbc_amount * 1e6);
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const tx = new tbc.Transaction();
		const utxos = await getUTXOs(address_from, tbc_amount + 0.001);
		if (receive_address.startsWith('1')) {
			tx.from(utxos).to(receive_address, satoshis_amount);
			if (tx.getEstimateSize() < 1000) {
				tx.fee(80);
			} else {
				tx.feePerKb(100);
			}
			tx.change(address_from).sign(privateKey).seal();
			const fee = tx.getFee();
			return { txHex: tx.uncheckedSerialize(), fee, address_to: receive_address };
		} else {
			const txraw = contract.MultiSig.p2pkhToMultiSig_sendTBC(
				address_from,
				receive_address,
				tbc_amount,
				utxos,
				privateKey,
			);
			return { txHex: txraw, fee: calculateFee(txraw), address_to: receive_address };
		}
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const sendTbc_multiSig_create = async (
	address_from: string,
	receive_address: string,
	tbc_amount: number,
	password: string,
) => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const script_asm = contract.MultiSig.getMultiSigLockScript(address_from);
		const umtxos = await contract.API.getUMTXOs(script_asm, tbc_amount + 0.001, 'mainnet');
		const multiTxraw = contract.MultiSig.buildMultiSigTransaction_sendTBC(
			address_from,
			receive_address,
			tbc_amount,
			umtxos,
		);
		const sigs = contract.MultiSig.signMultiSigTransaction_sendTBC(
			address_from,
			multiTxraw,
			privateKey,
		);
		return { multiTxraw, sigs };
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const sendTbc_multiSig_sign = (
	multiSigAddress: string,
	multiTxraw: contract.MultiSigTxRaw,
	password: string,
): string[] => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const sigs = contract.MultiSig.signMultiSigTransaction_sendTBC(
			multiSigAddress,
			multiTxraw,
			privateKey,
		);
		return sigs;
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const sendTbc_multiSig_finish = async (
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
		return await contract.API.broadcastTXraw(txraw, 'mainnet');
	} catch (error) {
		throw new Error('send fail');
	}
};
