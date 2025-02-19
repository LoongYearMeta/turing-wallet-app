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

export interface StoredUtxo {
	txId: string;
	outputIndex: number;
	satoshis: number;
	height: number;
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
	lastActiveTime: number;
	passKey: string;
	salt: string;
	currentAccount: string;
}

export type Keys = {
	mnemonic?: string;
	walletDerivationPath?: string;
	walletWif: string;
};

export interface Transaction {
	txHex: string;
	fee: number;
	address_to?: string;
}
