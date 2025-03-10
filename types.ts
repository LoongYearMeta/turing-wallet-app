export interface PubKey {
	tbcPubKey: string;
}
export interface Addresses {
	tbcAddress: string;
	taprootAddress?: string;
	taprootLegacyAddress?: string;
}
export interface Balance {
	tbc: number;
	satoshis: number;
}

export interface StoredUtxo {
	txId: string;
	outputIndex: number;
	satoshis: number;
	height: number;
	isSpented: boolean;
}

export enum AccountType {
	TBC = 'tbc',
	TAPROOT = 'taproot',
}

export interface Account {
	accountName: string;
	encryptedKeys: string;
	addresses: Addresses;
	balance: Balance;
	pubKey: PubKey;
	paymentUtxos: StoredUtxo[];
	type: AccountType;
}

export interface StorageObject {
	accounts: { [address: string]: Account };
	passKey: string;
	salt: string;
	currentAccount: string;
}

export interface Keys {
	mnemonic?: string;
	walletDerivationPath?: string;
	walletWif: string;
}

export interface Transaction {
	txHex: string;
	fee: number;
	address_to?: string;
	utxos?: StoredUtxo[];
	satoshis?: number;
}
