import '@/shim';
import * as contract from 'tbc-contract';

import { useAccount } from '@/hooks/useAccount';
import { StoredUtxo } from '@/types';

const { getCurrentAccountUtxos, updateCurrentAccountUtxos } = useAccount();

export function getTxHexByteLength(txHex: string) {
	return txHex.length / 2;
}

export function calculateFee(txHex: string) {
	const byteLength = getTxHexByteLength(txHex);
	const fullChunks = Math.floor(byteLength / 1000);
	const remainderBytes = byteLength % 1000;
	const totalFee = fullChunks * 100 + (remainderBytes > 0 ? 80 : 0);
	return totalFee;
}

export async function finish_transaction(txHex: string, utxos: StoredUtxo[]) {
	const txId = await contract.API.broadcastTXraw(txHex);
	if (txId) {
		let currentUtxos = getCurrentAccountUtxos();
		const updatedUtxos = currentUtxos!.map((utxo) => {
			const isSpent = utxos!.some(
				(spentUtxo) => spentUtxo.txId === utxo.txId && spentUtxo.outputIndex === utxo.outputIndex,
			);
			return isSpent ? { ...utxo, isSpented: true } : utxo;
		});

		await updateCurrentAccountUtxos(updatedUtxos);
		return txId;
	} else {
		throw new Error('Failed to broadcast transaction.');
	}
}
