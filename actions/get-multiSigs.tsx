import axios from 'axios';

import { addMultiSig, getAllMultiSigs, type MultiSig } from '@/utils/sqlite';

interface MultiSigResponse {
	multi_wallet_list: {
		multi_address: string;
		pubkey_list: string[];
	}[];
}

export async function fetchMultiSigs(address: string): Promise<MultiSigResponse> {
	const response = await axios.get(
		`https://turingwallet.xyz/v1/tbc/main/multisig/pubkeys/address/${address}`,
	);
	return response.data;
}

export async function initMultiSigs(address: string): Promise<void> {
	try {
		const response = await fetchMultiSigs(address);

		for (const multiSig of response.multi_wallet_list) {
			const multiSigData: MultiSig = {
				multiSig_address: multiSig.multi_address,
				pubKeys: multiSig.pubkey_list,
				isDeleted: false,
			};

			await addMultiSig(multiSigData, address);
		}
	} catch (error) {
		throw new Error('Failed to initialize MultiSigs');
	}
}

export async function syncMultiSigs(address: string): Promise<void> {
	try {
		const response = await fetchMultiSigs(address);
		const dbMultiSigs = await getAllMultiSigs(address);
		const dbMultiSigAddresses = new Set(dbMultiSigs.map((ms) => ms.multiSig_address));

		for (const multiSig of response.multi_wallet_list) {
			if (!dbMultiSigAddresses.has(multiSig.multi_address)) {
				const multiSigData: MultiSig = {
					multiSig_address: multiSig.multi_address,
					pubKeys: multiSig.pubkey_list,
					isDeleted: false,
				};

				await addMultiSig(multiSigData, address);
			}
		}
	} catch (error) {
		throw new Error('Failed to sync MultiSigs');
	}
}
