import axios from 'axios';

import { addFTHistory, getFTHistoryById } from '@/lib/ft';
import type { FTHistory } from '@/utils/sqlite';

interface FTHistoryResponse {
	address: string;
	script_hash: string;
	history_count: number;
	result: {
		txid: string;
		ft_contract_id: string;
		ft_balance_change: number;
		ft_decimal: number;
		tx_fee: number;
		sender_combine_script: string[];
		recipient_combine_script: string[];
		time_stamp: number;
		utc_time: string;
	}[];
}

export async function fetchFTHistory(
	address: string,
	contract_id: string,
	page: number,
): Promise<FTHistoryResponse> {
	const response = await axios.get(
		`https://turingwallet.xyz/v1/tbc/main/ft/history/address/${address}/contract/${contract_id}/page/${page}`,
	);
	return response.data;
}

export async function getFTHistoryInfo(
	address: string,
	contract_id: string,
): Promise<{ totalCount: number; maxPage: number }> {
	try {
		const response = await fetchFTHistory(address, contract_id, 0);
		const totalCount = response.history_count;
		const maxPage = Math.ceil(totalCount / 10) - 1;
		return { totalCount, maxPage };
	} catch (error) {
		return { totalCount: 0, maxPage: 0 };
	}
}

export async function initFTHistory(address: string, contract_id: string): Promise<void> {
	try {
		const { maxPage } = await getFTHistoryInfo(address, contract_id);

		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchFTHistory(address, contract_id, page);

			for (const tx of response.result) {
				const history: FTHistory = {
					id: tx.txid,
					send_address: tx.sender_combine_script[0] || '',
					receive_address: tx.recipient_combine_script[0] || '',
					fee: tx.tx_fee,
					timestamp: tx.time_stamp,
					contract_id: tx.ft_contract_id,
					balance_change: tx.ft_balance_change,
				};

				await addFTHistory(history);
			}
		}
	} catch (error) {
		throw new Error('Failed to initialize FT history');
	}
}

export async function syncFTHistory(address: string, contract_id: string): Promise<void> {
	try {
		let page = 0;
		while (true) {
			const response = await fetchFTHistory(address, contract_id, page);
			let foundExisting = false;

			for (const tx of response.result) {
				const existingHistory = await getFTHistoryById(tx.txid);
				if (existingHistory) {
					foundExisting = true;
					break;
				}

				const history: FTHistory = {
					id: tx.txid,
					send_address: tx.sender_combine_script[0] || '',
					receive_address: tx.recipient_combine_script[0] || '',
					fee: tx.tx_fee,
					timestamp: tx.time_stamp,
					contract_id: tx.ft_contract_id,
					balance_change: tx.ft_balance_change,
				};

				await addFTHistory(history);
			}

			if (foundExisting || response.result.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync FT history');
	}
}
