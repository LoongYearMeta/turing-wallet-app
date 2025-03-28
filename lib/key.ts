import '@/shim';
import * as bip39 from 'bip39';
import * as tbc from 'tbc-lib-js';

import { decrypt, deriveKey, encrypt, generateRandomSalt } from '@/lib/crypto';
import { Keys } from '@/types';
import { createFromWIF, getTaprootAddress } from '@/lib/taproot';
import { getTaprootLegacyAddress } from './taproot-legacy';

enum Tag {
	Turing = 'turing',
	Tp = 'tp',
	Okx = 'okx',
	Nabox = 'nabox',
}

export const generateKeysEncrypted_byMnemonic = (
	password: string,
	mnemonic: string,
	tag: Tag,
	salt?: string,
) => {
	if (!mnemonic) {
		const entropy = generateRandomSalt(16);
		mnemonic = bip39.entropyToMnemonic(entropy);
	} else {
		if (!tbc.Mnemonic.isValid(mnemonic)) {
			throw new Error('Invalid mnemonic');
		}
	}

	let walletDerivation: string;
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

	const keys = getKeys_mnemonic(mnemonic, walletDerivation);
	if (!salt) {
		salt = generateRandomSalt();
	}
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), password);
	const pubKey = tbc.PrivateKey.fromWIF(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromWIF(keys.walletWif).toAddress().toString();
	const taprootAddress = getTaprootAddress(createFromWIF(keys.walletWif));
	const taprootLegacyAddress = getTaprootLegacyAddress(taprootAddress);
	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		taprootAddress,
		taprootLegacyAddress,
		pubKey,
	};
};

export const generateKeysEncrypted_mnemonic = (password: string, salt?: string) => {
	const entropy = generateRandomSalt(16);
	const mnemonic = bip39.entropyToMnemonic(entropy);

	if (!tbc.Mnemonic.isValid(mnemonic)) {
		throw new Error('Invalid mnemonic');
	}

	const walletDerivation = "m/44'/236'/0'/1/0";

	const keys = getKeys_mnemonic(mnemonic, walletDerivation);
	if (!salt) {
		salt = generateRandomSalt();
	}
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), password);
	const pubKey = tbc.PrivateKey.fromWIF(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromWIF(keys.walletWif).toAddress().toString();
	const taprootAddress = getTaprootAddress(createFromWIF(keys.walletWif));
	const taprootLegacyAddress = getTaprootLegacyAddress(taprootAddress);
	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		taprootAddress,
		taprootLegacyAddress,
		pubKey,
	};
};

export const generateKeysEncrypted_wif = (password: string, wif: string, salt?: string) => {
	if (!tbc.PrivateKey.isValid(wif)) return null;
	const keys = getKeys_wif(wif);
	if (!salt) {
		salt = generateRandomSalt();
	}
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), password);
	const pubKey = tbc.PrivateKey.fromWIF(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromWIF(keys.walletWif).toAddress().toString();
	const taprootAddress = getTaprootAddress(keys.walletWif);
	const taprootLegacyAddress = getTaprootLegacyAddress(taprootAddress);
	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		taprootAddress,
		taprootLegacyAddress,
		pubKey,
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
	if (!password || !passKey || !salt) {
		return false;
	}
	try {
		const derivedKey = deriveKey(password, salt);
		return derivedKey === passKey;
	} catch (error) {
		console.debug('Password verification warning:', error);
		return false;
	}
};

export const retrieveKeys = (password: string, encryptedKeys: string): Keys => {
	try {
		return JSON.parse(decrypt(encryptedKeys, password));
	} catch (error) {
		console.debug('Key retrieval warning:', error);
		return { walletWif: '' };
	}
};

export const verifyPubKey = (pubKey: string): boolean => {
	return tbc.PublicKey.isValid(pubKey);
};
