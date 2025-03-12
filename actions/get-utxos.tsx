import '@/shim';

import { StoredUtxo } from '@/types';

export async function fetchUTXOs(address: string): Promise<StoredUtxo[]> {
	const url = `https://turingwallet.xyz/v1/tbc/main/address/${address}/unspent/`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error('Failed to fetch UTXO: '.concat(response.statusText));
		}
		const data: { tx_hash: string; tx_pos: number; height: number; value: number }[] =
			await response.json();
		if (data.length === 0) {
			throw new Error('The balance in the account is zero.');
		}

		return data.map((utxo) => ({
			txId: utxo.tx_hash,
			outputIndex: utxo.tx_pos,
			satoshis: utxo.value,
			height: utxo.height,
			isSpented: false,
		}));
	} catch (error: any) {
		throw new Error(error.message);
	}
}
