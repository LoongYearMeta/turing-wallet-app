import '@/shim';
import * as tbc from 'tbc-lib-js';

import { StoredUtxo } from '@/types';
import { store } from '@/utils/store';

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

export async function getUTXOs(
	address: string,
	tbc_amount: number,
): Promise<tbc.Transaction.IUnspentOutput[]> {
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
			return [
				{
					txId: largeUTXO.txId,
					outputIndex: largeUTXO.outputIndex,
					satoshis: largeUTXO.satoshis,
					script: scriptPubKey,
				},
			];
		}

		const maxHeight = Math.max(...utxos.map((utxo) => utxo.height));
		let prioritizedUTXOs = utxos.filter((utxo) => maxHeight - utxo.height > 300);

		let selectedUTXOs = [];
		let accumulatedSatoshis = 0;

		for (const utxo of prioritizedUTXOs) {
			selectedUTXOs.push(utxo);
			accumulatedSatoshis += utxo.satoshis;
			if (accumulatedSatoshis >= satoshis_amount) {
				break;
			}
		}

		if (accumulatedSatoshis < satoshis_amount) {
			for (const utxo of utxos) {
				if (!selectedUTXOs.includes(utxo)) {
					selectedUTXOs.push(utxo);
					accumulatedSatoshis += utxo.satoshis;
					if (accumulatedSatoshis >= satoshis_amount) {
						break;
					}
				}
			}
		}

		return selectedUTXOs.map((utxo) => ({
			txId: utxo.txId,
			outputIndex: utxo.outputIndex,
			satoshis: utxo.satoshis,
			script: scriptPubKey,
		}));
	} catch (error: any) {
		throw new Error(error.message);
	}
}
