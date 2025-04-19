import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';
import axios from 'axios';

import { StoredUtxo } from '@/types';

interface UTXOResponse {
	tx_hash: string;
	tx_pos: number;
	height: number;
	value: number;
}

export async function fetchUTXOs(address: string): Promise<StoredUtxo[]> {
	const url = `https://turingwallet.xyz/v1/tbc/main/address/${address}/unspent/`;

	try {
		const response = await axios.get<UTXOResponse[]>(url);
		const data = response.data;

		if (data.length === 0) {
			throw new Error('The balance in the account is zero.');
		}

		return data.map((utxo) => ({
			txId: utxo.tx_hash,
			outputIndex: utxo.tx_pos,
			satoshis: utxo.value,
			height: utxo.height,
			isSpented: false,
			address: address,
		}));
	} catch (error: any) {
		throw new Error(error.message || 'Failed to fetch UTXOs');
	}
}

export async function getUTXOsCount_multiSig(
	address: string,
	contractId?: string,
): Promise<number> {
	try {
		const script_asm = contract.MultiSig.getMultiSigLockScript(address);
		if (!contractId) {
			const utxos = await contract.API.fetchUMTXOs(script_asm, 'mainnet');
			return utxos.length;
		} else {
			const Token = new contract.FT(contractId);
			const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid, 'mainnet');
			Token.initialize(TokenInfo);
			const hash = tbc.crypto.Hash.sha256ripemd160(
				tbc.crypto.Hash.sha256(tbc.Script.fromASM(script_asm).toBuffer()),
			).toString('hex');
			const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, hash)
				.toBuffer()
				.toString('hex');
			const ftutxos = await contract.API.fetchFtUTXOS_multiSig(
				Token.contractTxid,
				hash,
				ftutxo_codeScript,
				'mainnet',
			);
			return ftutxos.length;
		}
	} catch (error: any) {
		return 0;
	}
}
