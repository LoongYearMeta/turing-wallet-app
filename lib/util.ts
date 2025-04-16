import '@/shim';
import * as contract from 'tbc-contract';

export function getTxHexByteLength(txHex: string) {
	return txHex.length / 2;
}

export const formatFee_tbc = (satoshis: number | string): string => {
	if (typeof satoshis === 'string') {
		satoshis = Number(satoshis);
	}
	const tbc = satoshis * 1e-6;
	return tbc.toFixed(6);
};

export const formatFee_btc = (satoshis: number | string): string => {
	if (typeof satoshis === 'string') {
		satoshis = Number(satoshis);
	}
	const btc = satoshis * 1e-8;
	return btc.toFixed(8);
};

export const formatBalance_tbc = (value: number | string): string => {
	if (typeof value === 'string') {
		value = Number(value);
	}
	return value.toFixed(6);
};

export const formatBalance_btc = (value: number | string): string => {
	if (typeof value === 'string') {
		value = Number(value);
	}
	return value.toFixed(8);
};

export const formatBalance_token = (token: number | string): string => {
	if (typeof token === 'string') {
		token = Number(token);
	}
	return (token * 1e-6).toFixed(6);
};

export function calculateFee(txHex: string) {
	const byteLength = getTxHexByteLength(txHex);
	const fullChunks = Math.floor(byteLength / 1000);
	const remainderBytes = byteLength % 1000;
	const totalFee = fullChunks * 100 + (remainderBytes > 0 ? 80 : 0);
	return totalFee;
}

export const formatLongString = (str: string, showLength: number = 8): string => {
	if (!str || str.length <= 15) return str;
	return `${str.slice(0, showLength)}...${str.slice(-showLength)}`;
};

export const formatDate = (timestamp: number) => {
	return new Date(timestamp * 1000).toLocaleString();
};

export function selectAddress(addresses: string[]): string {
	const multiSigAddress = addresses.find((addr) => addr.length === 34 && !addr.startsWith('1'));
	return multiSigAddress || addresses[0] || '';
}

export function getMultiSigType(multiSigAddress: string): string {
	const { signatureCount, publicKeyCount } = contract.MultiSig.getSignatureAndPublicKeyCount(
		multiSigAddress,
	);

	return `${signatureCount}/${publicKeyCount}`;
}

