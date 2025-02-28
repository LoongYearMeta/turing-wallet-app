import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Account, AccountType } from '@/types';

interface AccountStore {
	accounts: { [address: string]: Account };
	addAccount: (data: Account) => void;
	removeAccount: (address: string) => void;
}

const useAccount = create(
	persist<AccountStore>(
		(set, get) => ({
			accounts: {},
			addAccount: (data: Account) => {
				const currentAccounts = get().accounts;
				if (Object.keys(currentAccounts).length >= 5) {
					throw new Error('You can only have up to 5 accounts.');
				}

				const addressToCheck =
					data.type === AccountType.TAPROOT
						? data.addresses.taprootLegacyAddress && data.addresses.taprootAddress
						: data.addresses.tbcAddress;

				if (!addressToCheck) {
					throw new Error('Incorrect address');
				}

				if (currentAccounts[addressToCheck]) {
					throw new Error('Account already exists');
				}

				set({
					accounts: {
						...get().accounts,
						[addressToCheck]: data,
					},
				});
			},
			removeAccount: (address: string) => {
				const { [address]: _, ...remainingAccounts } = get().accounts;
				set({ accounts: remainingAccounts });
			},
		}),
		{
			name: 'accounts',
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);

export default useAccount;
