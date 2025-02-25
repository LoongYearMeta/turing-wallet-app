import type { TransactionHistory } from '@/utils/sqlite';
import { database } from '@/utils/sqlite';

export async function addTransactionHistory(
	transaction: TransactionHistory,
	accountAddress: string,
): Promise<void> {
	try {
		await database.addTransactionHistory(transaction, accountAddress);
	} catch (error) {
		throw new Error('Failed to add transaction history');
	}
}

export async function getTransactionHistoryByType(
	type: string,
	userAddress: string,
	pagination?: { page: number; pageSize: number },
): Promise<TransactionHistory[]> {
	try {
		return await database.getTransactionHistoryByType(type, userAddress, pagination);
	} catch (error) {
		return [];
	}
}

export async function getTransactionHistoryById(id: string): Promise<TransactionHistory | null> {
	try {
		return await database.getTransactionHistoryById(id);
	} catch (error) {
		return null;
	}
}

export async function getTransactionHistoryCount(userAddress: string): Promise<number> {
	try {
		return await database.getTransactionHistoryCount(userAddress);
	} catch (error) {
		return 0;
	}
}
