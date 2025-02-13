import '@/shim';
import { Transaction } from 'tbc-lib-js';

export type PubKeys = {
	tbcPubKey: string;
};
export type Addresses = {
	tbcAddress: string;
};
export type Balance = {
	tbc: number;
	satoshis: number;
};

export interface StoredUtxo extends Transaction.IUnspentOutput {
	isSpented: boolean;
}

export interface Account {
	accountName: string;
	encryptedKeys: string;
	addresses: Addresses;
	balance: Balance;
	pubKeys: PubKeys;
	paymentUtxos: StoredUtxo[];
}

export interface StorageObject {
	accounts: { [tbcAddress: string]: Account };
	selectedAccount: string;
	lastActiveTime: number;
	passKey: string;
	salt: string;
	isLocked: boolean;
}
