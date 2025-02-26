import type { MultiSig } from '@/utils/sqlite';
import { database } from '@/utils/sqlite';

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
