import type { TransactionHistory } from '@/utils/sqlite';
import { database } from '@/utils/sqlite';

export async function addTransactionHistory(transaction: TransactionHistory): Promise<void> {
	try {
		await database.addTransactionHistory(transaction);
	} catch (error) {
		throw new Error('Failed to add transaction history');
	}
}

export async function getTransactionHistoryByType(type: string): Promise<TransactionHistory[]> {
	try {
		return await database.getTransactionHistoryByType(type);
	} catch (error) {
		return [];
	}
}
