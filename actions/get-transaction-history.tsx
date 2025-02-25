import {
	addTransactionHistory,
	getTransactionHistoryById,
	getTransactionHistoryCount,
} from '@/lib/transaction_history';
import axios from 'axios';

interface TransactionHistoryResponse {
	address: string;
	script: string;
	history_count: number;
	result: {
		balance_change: string;
		banlance_change: string;
		tx_hash: string;
		sender_addresses: string[];
		recipient_addresses: string[];
		fee: string;
		time_stamp: number;
		utc_time: string;
		tx_type: string;
	}[];
}

export async function fetchTransactionHistory(
	address: string,
	page: number,
): Promise<TransactionHistoryResponse> {
	const response = await axios.get(
		`https://turingwallet.xyz/v1/tbc/main/address/${address}/history/page/${page}`,
	);
	return response.data;
}

export async function getTransactionHistoryInfo(
	address: string,
): Promise<{ totalCount: number; maxPage: number }> {
	try {
		const response = await fetchTransactionHistory(address, 0);
		const totalCount = response.history_count;
		const maxPage = Math.ceil(totalCount / 10) - 1;
		return { totalCount, maxPage };
	} catch (error) {
		return { totalCount: 0, maxPage: 0 };
	}
}

export async function initTransactionHistory(address: string): Promise<void> {
	try {
		const { maxPage } = await getTransactionHistoryInfo(address);
		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchTransactionHistory(address, page);

			for (const tx of response.result) {
				const history = {
					id: tx.tx_hash,
					send_address: tx.sender_addresses[0] || '',
					receive_address: tx.recipient_addresses[0] || '',
					fee: parseFloat(tx.fee),
					timestamp: tx.time_stamp,
					type: tx.tx_type,
				};

				await addTransactionHistory(history, address);
			}
		}
	} catch (error) {
		throw new Error('Failed to initialize transaction history');
	}
}

export async function syncTransactionHistory(address: string): Promise<void> {
	try {
		const { totalCount } = await getTransactionHistoryInfo(address);
		const dbCount = await getTransactionHistoryCount(address);

		if (dbCount === totalCount) {
			return;
		}
		let page = 0;
		while (true) {
			const response = await fetchTransactionHistory(address, page);
			let foundExisting = false;

			for (const tx of response.result) {
				const existingTx = await getTransactionHistoryById(tx.tx_hash);
				if (existingTx) {
					foundExisting = true;
					break;
				}

				const history = {
					id: tx.tx_hash,
					send_address: tx.sender_addresses[0] || '',
					receive_address: tx.recipient_addresses[0] || '',
					fee: parseFloat(tx.fee),
					timestamp: tx.time_stamp,
					type: tx.tx_type,
				};

				await addTransactionHistory(history, address);
			}

			if (foundExisting || response.result.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync transaction history');
	}
}
