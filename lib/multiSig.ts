import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { getUTXOs } from '@/actions/get-utxos';
import { finish_transaction } from '@/lib/util';
import { retrieveKeys } from '@/utils/key';
import type { MultiSig } from '@/utils/sqlite';
import { database } from '@/utils/sqlite';

export async function createMultiSig(
	pubKeys: string[],
	sigCount: number,
	address_from: string,
	password: string,
): Promise<string> {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const utxos = await getUTXOs(address_from, 1.001);
		const txraw = contract.MultiSig.createMultiSigWallet(
			address_from,
			pubKeys,
			sigCount,
			pubKeys.length,
			utxos,
			privateKey,
		);
		const storedUtxos = utxos.map((utxo) => ({
			...utxo,
			height: 0,
			isSpented: false,
		}));
		const txid = await finish_transaction(txraw, storedUtxos);
		if (!txid) {
			throw new Error('Failed to create MultiSig wallet!');
		}
		return contract.MultiSig.getMultiSigAddress(pubKeys, sigCount, pubKeys.length);
	} catch (error: any) {
		throw new Error(error.message);
	}
}

export async function addMultiSig(multiSig: MultiSig, userAddress: string): Promise<void> {
	try {
		await database.addMultiSig(multiSig, userAddress);
	} catch (error) {
		throw new Error('Failed to add MultiSig');
	}
}

export async function softDeleteMultiSig(multiSigAddress: string): Promise<void> {
	try {
		await database.softDeleteMultiSig(multiSigAddress);
	} catch (error) {
		throw new Error('Failed to delete MultiSig');
	}
}

export async function getMultiSigPubKeys(multiSigAddress: string): Promise<string[] | null> {
	try {
		return await database.getMultiSigPubKeys(multiSigAddress);
	} catch (error) {
		return null;
	}
}

export async function getActiveMultiSigs(userAddress: string): Promise<MultiSig[]> {
	try {
		return await database.getActiveMultiSigs(userAddress);
	} catch (error) {
		return [];
	}
}

export async function getAllMultiSigs(userAddress: string): Promise<MultiSig[]> {
	try {
		return await database.getAllMultiSigs(userAddress);
	} catch (error) {
		return [];
	}
}
