import '@/shim';
import * as bip39 from 'bip39';
import * as tbc from 'tbc-lib-js';

import { decrypt, deriveKey, encrypt, generateRandomSalt } from '@/lib/crypto';
import { Keys } from '@/types';

enum Tag {
	Turing = 'turing',
	Tp = 'tp',
	Okx = 'okx',
	Nabox = 'nabox',
}

export const generateKeysEncrypted_mnemonic = (password: string, mnemonic?: string, tag?: Tag) => {
	if (!mnemonic) {
		const entropy = generateRandomSalt(16);
		mnemonic = bip39.entropyToMnemonic(entropy);
	} else {
		if (!tbc.Mnemonic.isValid(mnemonic)) {
			throw new Error('Invalid mnemonic');
		}
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
	const pubKey = tbc.PrivateKey.fromWIF(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromWIF(keys.walletWif).toAddress().toString();
	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		pubKey,
	};
};

export const generateKeysEncrypted_wif = (password: string, wif: string) => {
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

export const verifyPassword = (password: string, passKey: string, salt: string): boolean => {
	const derivedKey = deriveKey(password, salt);
	return derivedKey === passKey;
};

export const retrieveKeys = (password: string, encryptedKeys: string, salt: string): Keys => {
	return JSON.parse(decrypt(encryptedKeys, password, salt));
};
