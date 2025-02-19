export function getTxHexByteLength(txHex: string) {
	return txHex.length / 2;
}

export function calculateFee(txHex: string) {
	const byteLength = getTxHexByteLength(txHex);
	const fullChunks = Math.floor(byteLength / 1000);
	const remainderBytes = byteLength % 1000;
	const totalFee = fullChunks * 100 + (remainderBytes > 0 ? 80 : 0);
	return totalFee;
}
