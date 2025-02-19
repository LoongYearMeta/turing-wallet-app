import '@/shim';
import * as tbc from 'tbc-lib-js';

import { Keys } from '@/types';
import { decrypt, deriveKey, encrypt, generateRandomSalt } from '@/utils/crypto';
import { store } from '@/utils/store';

enum Tag {
	Turing = 'turing',
	Tp = 'tp',
	Okx = 'okx',
	Nabox = 'nabox',
}

export const generateKeysEncrypted_mnemonic = async (
	password: string,
	mnemonic?: string,
	tag?: Tag,
) => {
	if (mnemonic) {
		if (!tbc.Mnemonic.isValid(mnemonic)) return null;
	} else {
		mnemonic = tbc.Mnemonic.fromRandom().toString();
	}
	let walletDerivation: string;
	if (tag) {
		switch (tag) {
			case 'tp':
				walletDerivation = "m/44'/0'/0'/0/0";
				break;
			case 'okx':
				walletDerivation = "m/44'/0'/0'/0/0";
				break;
			case 'nabox':
				walletDerivation = "m/44'/60'/0'/0/0";
				break;
			default:
				walletDerivation = "m/44'/236'/0'/1/0";
				break;
		}
	} else {
		walletDerivation = "m/44'/236'/0'/1/0";
	}
	const keys = getKeys_mnemonic(mnemonic, walletDerivation);
	const salt = generateRandomSalt();
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), passKey);
	return {
		salt,
		passKey,
		encryptedKeys,
	};
};

export const generateKeysEncrypted_wif = async (password: string, wif: string) => {
	if (!tbc.PrivateKey.isValid(wif)) return null;
	const keys = getKeys_wif(wif);
	const salt = generateRandomSalt();
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), passKey);
	return {
		salt,
		passKey,
		encryptedKeys,
	};
};

export const getKeys_mnemonic = (mnemonic: string, walletDerivationPath: string): Keys => {
	const HDPrivateKey = tbc.Mnemonic.fromString(mnemonic).toHDPrivateKey('', 'livenet');
	const derivedHDPrivateKey = HDPrivateKey.deriveChild(walletDerivationPath);
	const privateKey = derivedHDPrivateKey.privateKey;
	return {
		mnemonic,
		walletDerivationPath,
		walletWif: privateKey.toWIF(),
	};
};

export const getKeys_wif = (wif: string): Keys => {
	return {
		walletWif: wif,
	};
};

export const verifyPassword = (password: string): boolean => {
	const salt = store.getSalt();
	const passKey = store.getPassKey();
	const derivedKey = deriveKey(password, salt);
	return derivedKey === passKey;
};

export const retrieveKeys = (password: string): Keys => {
	const currentAccount = store.getCurrentAccount();
	const encryptedKeys = currentAccount!.encryptedKeys;
	const passKey = deriveKey(password, store.getSalt());
	const keys = decrypt(encryptedKeys, passKey);
	return JSON.parse(keys);
};
