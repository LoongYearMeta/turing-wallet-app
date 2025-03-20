import axios from 'axios';

import { addNFTHistory, getNFTHistoryById, updateNFTHistory, type NFTHistory } from '@/utils/sqlite';

interface NFTHistoryResponse {
	address: string;
	script_hash: string;
	history_count: number;
	result: {
		txid: string;
		collection_id: string;
		collection_index: number;
		collection_name: string;
		nft_contract_id: string;
		nft_name: string;
		nft_symbol: string;
		nft_description: string;
		sender_addresses: string[];
		recipient_addresses: string[];
		time_stamp: number;
		utc_time: string;
		nft_icon: string;
	}[];
}

export async function fetchNFTHistory(address: string, page: number): Promise<NFTHistoryResponse> {
	const response = await axios.get(
		`https://turingwallet.xyz/v1/tbc/main/nft/history/address/${address}/page/${page}/size/10`,
	);
	return response.data;
}

export async function getNFTHistoryInfo(
	address: string,
): Promise<{ totalCount: number; maxPage: number }> {
	try {
		const response = await fetchNFTHistory(address, 0);
		const totalCount = response.history_count;
		const maxPage = Math.ceil(totalCount / 10) - 1;
		return { totalCount, maxPage };
	} catch (error) {
		return { totalCount: 0, maxPage: 0 };
	}
}

export async function initNFTHistory(address: string): Promise<void> {
	try {
		const { maxPage } = await getNFTHistoryInfo(address);

		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchNFTHistory(address, page);

			for (const tx of response.result) {
				const history: NFTHistory = {
					id: tx.txid,
					send_address: tx.sender_addresses[0] || '',
					receive_address: tx.recipient_addresses[0] || '',
					timestamp: tx.time_stamp,
					contract_id: tx.nft_contract_id,
				};

				await addNFTHistory(history);
			}
		}
	} catch (error) {
		throw new Error('Failed to initialize NFT history');
	}
}

export async function syncNFTHistory(address: string, contract_id?: string): Promise<void> {
	try {
		let page = 0;
		const currentTimestamp = Math.floor(Date.now() / 1000);

		while (true) {
			const response = await fetchNFTHistory(address, page);
			let foundExisting = false;

			for (const tx of response.result) {
				if (contract_id && tx.nft_contract_id !== contract_id) {
					continue;
				}

				const existingHistory = await getNFTHistoryById(tx.txid);
				
				if (
					existingHistory &&
					existingHistory.timestamp &&
					existingHistory.timestamp === tx.time_stamp
				) {
					foundExisting = true;
					break;
				}

				if (existingHistory) {
					await updateNFTHistory({
						...existingHistory,
						timestamp: tx.time_stamp || currentTimestamp,
					});
					continue;
				}

				const history: NFTHistory = {
					id: tx.txid,
					send_address: tx.sender_addresses[0] || '',
					receive_address: tx.recipient_addresses[0] || '',
					timestamp: tx.time_stamp || currentTimestamp,
					contract_id: tx.nft_contract_id,
				};

				await addNFTHistory(history);
			}

			if (foundExisting || response.result.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		console.error('Failed to sync NFT history:', error);
		throw new Error('Failed to sync NFT history');
	}
}
