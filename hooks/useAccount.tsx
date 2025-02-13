import AsyncStorage from '@react-native-async-storage/async-storage';
import Snackbar from 'react-native-snackbar';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Account, Balance, StoredUtxo } from '@/types';

interface AccountStore {
	accounts: Account[];
	addAccount: (data: Account) => void;
	updateAccount: (
		address: string,
		accountName?: string,
		balance?: Balance,
		paymentUtxos?: StoredUtxo[],
	) => void;
	removeAccount: (address: string) => void;
}

const useAccount = create(
	persist<AccountStore>(
		(set, get) => ({
			accounts: [],
			addAccount: (data: Account) => {
				const currentAccounts = get().accounts;
				if (currentAccounts.length >= 5) {
					Snackbar.show({
						text: 'Maximum account limit reached. Please remove some accounts first.',
						duration: Snackbar.LENGTH_LONG,
					});
					return;
				}
				const existingAccount = currentAccounts.find(
					(account) => account.addresses.tbcAddress === data.addresses.tbcAddress,
				);
				if (existingAccount) {
					Snackbar.show({
						text: 'Account already exists.',
						duration: Snackbar.LENGTH_SHORT,
					});
					return;
				}
				set({ accounts: [...get().accounts, data] });
				Snackbar.show({
					text: 'Account added successfully.',
					duration: Snackbar.LENGTH_SHORT,
				});
			},
			updateAccount: (
				address: string,
				accountName?: string,
				balance?: Balance,
				paymentUtxos?: StoredUtxo[],
			) => {
				const currentAccounts = get().accounts;
				const accountIndex = currentAccounts.findIndex(
					(account) => account.addresses.tbcAddress === address,
				);

				if (accountIndex === -1) {
					Snackbar.show({
						text: 'Account not found.',
						duration: Snackbar.LENGTH_SHORT,
					});
					return;
				}

				const updatedAccount = { ...currentAccounts[accountIndex] };

				if (accountName !== undefined) {
					updatedAccount.accountName = accountName;
				}
				if (balance !== undefined) {
					updatedAccount.balance = balance;
				}
				if (paymentUtxos !== undefined) {
					updatedAccount.paymentUtxos = paymentUtxos;
				}

				const updatedAccounts = [...currentAccounts];
				updatedAccounts[accountIndex] = updatedAccount;

				set({ accounts: updatedAccounts });
			},
			removeAccount: (address: string) => {
				set({
					accounts: [
						...get().accounts.filter((account) => account.addresses.tbcAddress !== address),
					],
				});
				Snackbar.show({
					text: 'Account removed successfully.',
					duration: Snackbar.LENGTH_SHORT,
				});
			},
		}),
		{
			name: 'accounts',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);

export default useAccount;
