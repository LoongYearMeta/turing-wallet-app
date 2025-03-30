import axios from 'axios';

import { getAllFTs, getFT, removeFT, upsertFT, type FT } from '@/utils/sqlite';

interface FTResponse {
	address: string;
	token_count: number;
	token_list: {
		ft_contract_id: string;
		ft_decimal: number;
		ft_balance: number;
		ft_name: string;
		ft_symbol: string;
	}[];
}

export async function fetchFTs(address: string): Promise<FTResponse> {
	const response = await axios.get(
		`https://turingwallet.xyz/v1/tbc/main/ft/tokens/held/by/address/${address}`,
	);
	return response.data;
}

export async function initFTs(address: string): Promise<void> {
	try {
		const response = await fetchFTs(address);

		for (const token of response.token_list) {
			const ftData: FT = {
				id: token.ft_contract_id,
				name: token.ft_name,
				decimal: token.ft_decimal,
				amount: token.ft_balance / Math.pow(10, token.ft_decimal),
				symbol: token.ft_symbol,
				isDeleted: false,
			};

			await upsertFT(ftData, address);
		}
	} catch (error) {
		throw new Error('Failed to initialize FTs');
	}
}

export async function syncFTs(address: string): Promise<void> {
	try {
		const response = await fetchFTs(address);
		const apiTokenIds = new Set(response.token_list.map((token) => token.ft_contract_id));

		const dbFTs = await getAllFTs(address);

		for (const ft of dbFTs) {
			if (!apiTokenIds.has(ft.id)) {
				await removeFT(ft.id, address);
			}
		}

		for (const token of response.token_list) {
			const ftData: FT = {
				id: token.ft_contract_id,
				name: token.ft_name,
				decimal: token.ft_decimal,
				amount: token.ft_balance * Math.pow(10, -token.ft_decimal),
				symbol: token.ft_symbol,
				isDeleted: false,
			};

			const existingFT = await getFT(token.ft_contract_id, address);
			if (!existingFT || existingFT.amount !== ftData.amount) {
				await upsertFT(ftData, address);
			}
		}
	} catch (error) {
		throw new Error('Failed to sync FTs');
	}
}
