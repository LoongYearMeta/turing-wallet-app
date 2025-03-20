export function getTxHexByteLength(txHex: string) {
	return txHex.length / 2;
}

export const formatFee = (satoshis: number): string => {
	const tbc = satoshis * 1e-6;
	return tbc.toFixed(6);
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

export const formatBalance = (value: number): string => {
	return value.toFixed(6);
};

export const formatContractId = (id: string, showLength: number = 10): string => {
	if (!id || id.length <= 20) return id;
	return `${id.slice(0, showLength)}...${id.slice(-showLength)}`;
};

export const formatPubKey = (pubKey: string): string => {
	if (!pubKey || pubKey.length <= 40) return pubKey;
	return `${pubKey.slice(0, 20)}...${pubKey.slice(-20)}`;
};

export const formatDate = (timestamp: number) => {
	return new Date(timestamp * 1000).toLocaleString();
};
