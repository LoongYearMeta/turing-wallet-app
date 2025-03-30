import {
	addTransactionHistory,
	getTransactionHistoryById,
	updateTransactionHistory,
} from '@/utils/sqlite';
import axios from 'axios';

export async function get_BTC_AddressBalance(address: string): Promise<{
	total: number;
}> {
	const baseUrl = 'https://blockstream.info/api';

	try {
		const addressInfo = await axios.get(`${baseUrl}/address/${address}`);

		const stats = addressInfo.data;
		const chainStats = stats.chain_stats;
		const mempoolStats = stats.mempool_stats;

		const spendableBalance = chainStats.funded_txo_sum - chainStats.spent_txo_sum;
		const unconfirmedBalance = mempoolStats.funded_txo_sum - mempoolStats.spent_txo_sum;

		return {
			total: (spendableBalance + unconfirmedBalance) * Math.pow(10, -8),
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			throw new Error(`${error.response?.statusText || error.message}`);
		}
		throw error;
	}
}

export async function get_BTC_TransactionHistory(
	address: string,
	limit: number = 30,
): Promise<
	Array<{
		txid: string;
		timestamp: number | null;
		amount: number;
		fee: number;
		senders: string[];
		recipients: string[];
		myAddress: string;
	}>
> {
	const baseUrl = 'https://blockstream.info/api';

	try {
		const response = await axios.get(`${baseUrl}/address/${address}/txs/chain/${limit}`);

		const txs = await Promise.all(
			response.data.map(async (tx: any) => {
				const senders = tx.vin
					.map((input: any) => input.prevout.scriptpubkey_address)
					.filter((addr: string | null) => addr !== null);

				if (senders.length === 0) {
					senders.push(address);
				}

				let recipients = tx.vout
					.map((output: any) => output.scriptpubkey_address)
					.filter((addr: string | null) => addr !== null);

				if (recipients.length === 0) {
					recipients.push(address);
				}

				let amount = 0;

				const inputAmount = tx.vin
					.filter((input: any) => input.prevout.scriptpubkey_address === address)
					.reduce((sum: number, input: any) => sum + input.prevout.value, 0);

				const outputAmount = tx.vout
					.filter((output: any) => output.scriptpubkey_address === address)
					.reduce((sum: number, output: any) => sum + output.value, 0);

				amount = outputAmount - inputAmount;

				const result = {
					txid: tx.txid,
					confirmed: tx.status.confirmed,
					timestamp: tx.status.block_time || null,
					amount,
					fee: tx.fee || 0,
					senders: Array.from(new Set(senders)),
					recipients: Array.from(new Set(recipients)),
				};

				return result;
			}),
		);

		return txs;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			throw new Error(` ${error.response.statusText}`);
		}
		throw error;
	}
}

export async function getBTCPriceInfo(): Promise<{
	currentPrice: number;
	priceChangePercent24h: number;
}> {
	try {
		const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
			params: {
				ids: 'bitcoin',
				vs_currencies: 'usd',
				include_24hr_change: true,
				include_24hr_vol: true,
				include_market_cap: true,
				include_last_updated_at: true,
			},
		});

		const data = response.data.bitcoin;
		return {
			currentPrice: data.usd,
			priceChangePercent24h: data.usd_24h_change,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			throw new Error(`${error.response.statusText}`);
		}
		throw error;
	}
}

export async function init_BTC_TransactionHistory(address: string): Promise<void> {
	try {
		const transactions = await get_BTC_TransactionHistory(address);

		for (const tx of transactions) {
			const history = {
				id: tx.txid,
				send_address: tx.senders[0],
				receive_address: tx.recipients[0],
				fee: tx.fee * Math.pow(10, -8),
				timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
				type: 'P2TR',
				balance_change: tx.amount * Math.pow(10, -8),
			};

			await addTransactionHistory(history, address);
		}
	} catch (error) {
		throw new Error('Failed to initialize BTC transaction history');
	}
}

export async function sync_BTC_TransactionHistory(address: string): Promise<void> {
	try {
		const transactions = await get_BTC_TransactionHistory(address);
		const currentTimestamp = Math.floor(Date.now() / 1000);

		for (const tx of transactions) {
			const existingTx = await getTransactionHistoryById(tx.txid);

			if (existingTx && existingTx.timestamp === tx.timestamp) {
				break;
			}

			if (existingTx) {
				await updateTransactionHistory({
					...existingTx,
					timestamp: tx.timestamp || currentTimestamp,
				});
				continue;
			}

			const history = {
				id: tx.txid,
				send_address: tx.senders[0],
				receive_address: tx.recipients[0],
				fee: tx.fee * Math.pow(10, -8),
				timestamp: tx.timestamp || currentTimestamp,
				type: 'P2TR',
				balance_change: tx.amount * Math.pow(10, -8),
			};

			await addTransactionHistory(history, address);
		}
	} catch (error) {
		throw new Error('Failed to sync BTC transaction history');
	}
}
