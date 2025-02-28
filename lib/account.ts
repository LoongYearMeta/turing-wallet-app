import useAccount from '@/hooks/useAccount';
import { database } from '@/utils/sqlite';
import { store } from '@/utils/store';

export async function clearAccountData(address: string): Promise<void> {
	try {
		await database.deleteAccountData(address);

		const removeAccount = useAccount.getState().removeAccount;
		removeAccount(address);

		if (store.getCurrentAccountAddress() === address) {
			await store.clear();
		}
	} catch (error) {
		throw new Error('Failed to clear account data');
	}
}
