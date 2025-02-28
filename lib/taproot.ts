import '@/shim';
import * as tbc from 'tbc-lib-js';

export const getTaprootTweakPrivateKey = (privateKeyWif: string): string => {
	const privateKeyHex = tbc.Taproot.wifToSeckey(privateKeyWif);
	const taprootTweakPrivateKey = tbc.Taproot.seckeyToTaprootTweakSeckey(privateKeyHex);
	return taprootTweakPrivateKey.toString('hex');
};

export const getTaprootAddress = (privateKeyWif: string): string => {
	const privateKeyHex = tbc.Taproot.wifToSeckey(privateKeyWif);
	const publicKey = tbc.Taproot.pubkeyGen(privateKeyHex);
	const taprootTweakPublicKey = tbc.Taproot.pubkeyToTaprootTweakPubkey(publicKey);
	return tbc.Taproot.taprootTweakPubkeyToTaprootAddress(taprootTweakPublicKey);
};

export const getTaprootLegacyAddress = (privateKeyWif: string): string => {
	const privateKeyHex = tbc.Taproot.wifToSeckey(privateKeyWif);
	const publicKey = tbc.Taproot.pubkeyGen(privateKeyHex);
	const taprootTweakPublicKey = tbc.Taproot.pubkeyToTaprootTweakPubkey(publicKey);
	return tbc.Taproot.pubkeyToLegacyAddress(taprootTweakPublicKey);
};
