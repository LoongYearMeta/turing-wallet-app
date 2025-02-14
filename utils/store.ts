import AsyncStorage from '@react-native-async-storage/async-storage';

import { Account, Balance, PubKeys, StorageObject, StoredUtxo } from '@/types';

const STORAGE_KEY = 'wallet_storage';

class Store {
	private static instance: Store;
	private storage: StorageObject = {
		accounts: {},
		lastActiveTime: 0,
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

	public async init(): Promise<void> {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (stored) {
				this.storage = JSON.parse(stored);
			}
		} catch (error) {
			console.error('Failed to initialize storage:', error);
		}
	}

	private async saveStorage(): Promise<void> {
		try {
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
		} catch (error) {
			console.error('Failed to save storage:', error);
		}
	}

	public getAllAccounts(): Account[] {
		return Object.values(this.storage.accounts);
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

	public getCurrentAccountPubKeys(): PubKeys | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.pubKeys || null;
	}

	public getCurrentAccountUtxos(): StoredUtxo[] | null {
		const currentAccount = this.getCurrentAccount();
		return currentAccount?.paymentUtxos || null;
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

	public async setPassKey(passKey: string): Promise<void> {
		this.storage.passKey = passKey;
		await this.saveStorage();
	}

	public getPassKey(): string {
		return this.storage.passKey;
	}

	public async setSalt(salt: string): Promise<void> {
		this.storage.salt = salt;
		await this.saveStorage();
	}

	public getSalt(): string {
		return this.storage.salt;
	}

	public async updateLastActiveTime(): Promise<void> {
		this.storage.lastActiveTime = Date.now();
		await this.saveStorage();
	}

	public getLastActiveTime(): number {
		return this.storage.lastActiveTime;
	}

	public async clear(): Promise<void> {
		this.storage = {
			accounts: {},
			lastActiveTime: 0,
			passKey: '',
			salt: '',
			currentAccount: '',
		};
		await this.saveStorage();
	}
}

export const store = Store.getInstance();
