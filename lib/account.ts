import useAccount from '@/hooks/useAccount';
import { deleteAccountData } from '@/utils/sqlite';
import { store } from '@/utils/store';

export async function clearAccountData(address: string): Promise<void> {
	try {
		await deleteAccountData(address);

		const removeAccount = useAccount.getState().removeAccount;
		removeAccount(address);

		if (store.getCurrentAccountAddress() === address) {
			await store.clear();
		}
	} catch (error) {
		throw new Error('Failed to clear account data');
	}
}
