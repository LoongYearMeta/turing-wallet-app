import AsyncStorage from '@react-native-async-storage/async-storage';

import { Account, AccountType, Balance, StorageObject, StoredUtxo } from '@/types';

const STORAGE_KEY = 'wallet_storage';

class Store {
	private static instance: Store;
	private storage: StorageObject = {
		accounts: {},
		passKey: '',
		salt: '',
		currentAccount: '',
	};

	private constructor() {}

	public static getInstance(): Store {
		if (!Store.instance) {
			Store.instance = new Store();
		}
		return Store.instance;
	}

	private async saveStorage(): Promise<void> {
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
		} catch (error) {
			console.error('Failed to save storage:', error);
			throw error;
		}
	}

	public async setCurrentAccount(address: string): Promise<void> {
		this.storage.currentAccount = address;
		await this.saveStorage();
	}

	public getCurrentAccount(): Account | null {
		return this.storage.accounts[this.storage.currentAccount] || null;
	}

	public getCurrentAccountAddress(): string {
		return this.storage.currentAccount;
	}

	public getCurrentAccountName(): string | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.accountName || null;
	}

	public getCurrentAccountBalance(): Balance | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.balance || null;
	}

	public getCurrentAccountTbcPubKey(): string | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.pubKey.tbcPubKey || null;
	}

	public getCurrentAccountUtxos(): StoredUtxo[] | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.paymentUtxos.filter((utxo) => !utxo.isSpented) || null;
	}

	public async updateCurrentAccountName(name: string): Promise<void> {
		const currentAccount = this.getCurrentAccount();
		if (currentAccount) {
			currentAccount.accountName = name;
			await this.saveStorage();
		}
	}

	public async updateCurrentAccountBalance(balance: Balance): Promise<void> {
		const currentAccount = this.getCurrentAccount();
		if (currentAccount) {
			currentAccount.balance = balance;
			await this.saveStorage();
		}
	}

	public async updateCurrentAccountUtxos(utxos: StoredUtxo[]): Promise<void> {
		const currentAccount = this.getCurrentAccount();
		if (currentAccount) {
			currentAccount.paymentUtxos = utxos;
			await this.saveStorage();
		}
	}

	public getPassKey(): string {
		return this.storage.passKey;
	}

	public getSalt(): string {
		return this.storage.salt;
	}

	public async clear(): Promise<void> {
		this.storage = {
			accounts: {},
			passKey: '',
			salt: '',
			currentAccount: '',
		};
		await this.saveStorage();
	}

	public getCurrentAccountType(): AccountType {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.type || AccountType.TBC;
	}

	public getCurrentTaprootAddress(): string | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.type === AccountType.TAPROOT
			? currentAccount.addresses.taprootAddress
				? currentAccount.addresses.taprootAddress
				: null
			: null;
	}

	public isTaprootAccount(): boolean {
		const account = this.storage.accounts[this.storage.currentAccount];
		return account?.type === AccountType.TAPROOT;
	}

	public async switchToTaproot(): Promise<void> {
		const account = this.getCurrentAccount();
		if (!account || !account.addresses.taprootAddress || !account.addresses.taprootLegacyAddress) {
			throw new Error('Account cannot be switched to Taproot');
		}
		const accountData = { ...account };
		delete this.storage.accounts[this.storage.currentAccount];
		accountData.type = AccountType.TAPROOT;
		this.storage.accounts[account.addresses.taprootLegacyAddress] = accountData;
		this.storage.currentAccount = account.addresses.taprootLegacyAddress;
		await this.saveStorage();
	}

	public async switchToTBC(): Promise<void> {
		const account = this.getCurrentAccount();
		if (!account || !account.addresses.tbcAddress) {
			throw new Error('Account cannot be switched to TBC');
		}
		const accountData = { ...account };
		delete this.storage.accounts[this.storage.currentAccount];
		accountData.type = AccountType.TBC;
		this.storage.accounts[account.addresses.tbcAddress] = accountData;
		this.storage.currentAccount = account.addresses.tbcAddress;
		await this.saveStorage();
	}

	public canSwitchToTaproot(): boolean {
		const account = this.storage.accounts[this.storage.currentAccount];
		return (
			account?.type === AccountType.TBC &&
			!!account.addresses.taprootAddress &&
			!!account.addresses.taprootLegacyAddress
		);
	}

	public async setPassKeyAndSalt(passKey: string, salt: string): Promise<void> {
		this.storage.passKey = passKey;
		this.storage.salt = salt;
		await this.saveStorage();
	}
}

export const store = Store.getInstance();
