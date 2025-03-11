import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Account, AccountType, Balance, StoredUtxo } from '@/types';

const STORAGE_KEY = 'wallet_storage';

interface AccountState {
	accounts: { [address: string]: Account };
	currentAccount: string;
	passKey: string;
	salt: string;
}

interface AccountStore extends AccountState {
	addAccount: (data: Account) => Promise<void>;
	removeAccount: (address: string) => Promise<void>;
	setCurrentAccount: (address: string) => Promise<void>;
	getCurrentAccount: () => Account | null;
	getAccountsCount: () => number;
	getAllAccounts: () => Account[];
	getAllAccountAddresses: () => string[];
	accountExists: (address: string) => boolean;

	getCurrentAccountAddress: () => string;
	getCurrentAccountName: () => string | null;
	getCurrentAccountBalance: () => Balance | null;
	getCurrentAccountTbcPubKey: () => string | null;
	getCurrentAccountUtxos: () => StoredUtxo[] | null;
	getCurrentAccountType: () => AccountType;
	getCurrentTaprootAddress: () => string | null;
	isTaprootAccount: () => boolean;
	canSwitchToTaproot: () => boolean;

	updateCurrentAccountName: (name: string) => Promise<void>;
	updateCurrentAccountBalance: (balance: Balance) => Promise<void>;
	updateCurrentAccountUtxos: (utxos: StoredUtxo[]) => Promise<void>;

	switchToTaproot: () => Promise<void>;
	switchToTBC: () => Promise<void>;

	setPassKeyAndSalt: (passKey: string, salt: string) => Promise<void>;
	getSalt: () => string;
	getPassKey: () => string;

	clear: () => Promise<void>;
}

export const useAccount = create(
	persist<AccountStore>(
		(set, get) => ({
			accounts: {},
			currentAccount: '',
			passKey: '',
			salt: '',

			addAccount: async (data: Account) => {
				const currentAccounts = get().accounts;
				if (Object.keys(currentAccounts).length >= 5) {
					throw new Error('You can only have up to 5 accounts.');
				}

				const addressToCheck =
					data.type === AccountType.TAPROOT
						? data.addresses.taprootLegacyAddress || data.addresses.taprootAddress
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

			removeAccount: async (address: string) => {
				const { [address]: _, ...remainingAccounts } = get().accounts;
				set({ accounts: remainingAccounts });
			},

			setCurrentAccount: async (address: string) => {
				set({ currentAccount: address });
			},

			getCurrentAccount: () => {
				const { accounts, currentAccount } = get();
				return currentAccount ? accounts[currentAccount] : null;
			},

			getAccountsCount: () => {
				return Object.keys(get().accounts).length;
			},

			getAllAccounts: () => {
				return Object.values(get().accounts);
			},

			getAllAccountAddresses: () => {
				return Object.keys(get().accounts);
			},

			accountExists: (address: string) => {
				return !!get().accounts[address];
			},

			getCurrentAccountAddress: () => {
				return get().currentAccount;
			},

			getCurrentAccountName: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.accountName || null;
			},

			getCurrentAccountBalance: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.balance || null;
			},

			getCurrentAccountTbcPubKey: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.pubKey.tbcPubKey || null;
			},

			getCurrentAccountUtxos: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.paymentUtxos.filter((utxo) => !utxo.isSpented) || null;
			},

			getCurrentAccountType: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.type || AccountType.TBC;
			},

			getCurrentTaprootAddress: () => {
				const currentAccount = get().getCurrentAccount();
				return currentAccount?.type === AccountType.TAPROOT
					? currentAccount.addresses.taprootAddress || null
					: null;
			},

			isTaprootAccount: () => {
				const account = get().accounts[get().currentAccount];
				return account?.type === AccountType.TAPROOT;
			},

			canSwitchToTaproot: () => {
				const account = get().accounts[get().currentAccount];
				return (
					account?.type === AccountType.TBC &&
					!!account.addresses.taprootAddress &&
					!!account.addresses.taprootLegacyAddress
				);
			},

			updateCurrentAccountName: async (name: string) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = { ...currentAccount, accountName: name };
					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			updateCurrentAccountBalance: async (balance: Balance) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = { ...currentAccount, balance };
					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			updateCurrentAccountUtxos: async (utxos: StoredUtxo[]) => {
				const currentAccount = get().getCurrentAccount();
				if (currentAccount) {
					const updatedAccount = { ...currentAccount, paymentUtxos: utxos };
					set({
						accounts: {
							...get().accounts,
							[get().currentAccount]: updatedAccount,
						},
					});
				}
			},

			switchToTaproot: async () => {
				const account = get().getCurrentAccount();
				if (
					!account ||
					!account.addresses.taprootAddress ||
					!account.addresses.taprootLegacyAddress
				) {
					throw new Error('Account cannot be switched to Taproot');
				}

				const { [get().currentAccount]: currentAccount, ...otherAccounts } = get().accounts;
				const updatedAccount = { ...currentAccount, type: AccountType.TAPROOT };

				set({
					accounts: {
						...otherAccounts,
						[account.addresses.taprootLegacyAddress]: updatedAccount,
					},
					currentAccount: account.addresses.taprootLegacyAddress,
				});
			},

			switchToTBC: async () => {
				const account = get().getCurrentAccount();
				if (!account || !account.addresses.tbcAddress) {
					throw new Error('Account cannot be switched to TBC');
				}

				const { [get().currentAccount]: currentAccount, ...otherAccounts } = get().accounts;
				const updatedAccount = { ...currentAccount, type: AccountType.TBC };

				set({
					accounts: {
						...otherAccounts,
						[account.addresses.tbcAddress]: updatedAccount,
					},
					currentAccount: account.addresses.tbcAddress,
				});
			},

			setPassKeyAndSalt: async (passKey: string, salt: string) => {
				set({ passKey, salt });
			},

			getSalt: () => get().salt,

			getPassKey: () => get().passKey,

			clear: async () => {
				set({
					accounts: {},
					currentAccount: '',
					passKey: '',
					salt: '',
				});
			},
		}),
		{
			name: STORAGE_KEY,
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
