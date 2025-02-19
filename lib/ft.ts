import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { fetchUTXOs } from '@/actions/get-utxos';
import { sendTbc } from '@/lib/tbc';
import { calculateFee } from '@/lib/util';
import { retrieveKeys } from '@/utils/key';
import { store } from '@/utils/store';

export const transferFT = async (
	contractId: string,
	address_from: string,
	address_to: string,
	ft_amount: number,
	password: string,
) => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const Token = new contract.FT(contractId);
		const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
		Token.initialize(TokenInfo);
		const transferTokenAmountBN = BigInt(Math.floor(ft_amount * Math.pow(10, Token.decimal)));
		const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
			.toBuffer()
			.toString('hex');
		let ftutxos: tbc.Transaction.IUnspentOutput[] = [];
		try {
			ftutxos = await contract.API.fetchFtUTXOs(
				Token.contractTxid,
				address_from,
				ftutxo_codeScript,
				'mainnet',
				transferTokenAmountBN,
			);
		} catch (error: any) {
			if (error.message.includes('Insufficient FTbalance, please merge FT UTXOs')) {
				try {
					await mergeFT(contractId, address_from, password);
				} catch (error: any) {
					throw new Error(error.message);
				}
			} else {
				throw new Error(error.message);
			}
		}

		ftutxos = await contract.API.fetchFtUTXOs(
			Token.contractTxid,
			address_from,
			ftutxo_codeScript,
			'mainnet',
			transferTokenAmountBN,
		);
		// }
		let preTXs: tbc.Transaction[] = [];
		let prepreTxDatas: string[] = [];
		for (let i = 0; i < ftutxos.length; i++) {
			preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId));
			prepreTxDatas.push(await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex));
		}
		const utxo = await getUTXO(address_from, 0.01, password);

		const txHex = Token.transfer(
			privateKey,
			address_to,
			ft_amount,
			ftutxos,
			utxo,
			preTXs,
			prepreTxDatas,
		);

		return { txHex, fee: calculateFee(txHex), address_to };
	} catch (error: any) {
		throw new Error(error.message);
	}
};

const mergeFT = async (contractId: string, address_from: string, password: string) => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const Token = new contract.FT(contractId);
		const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
		Token.initialize(TokenInfo);
		const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
			.toBuffer()
			.toString('hex');

		let txids: string[] = [];
		for (let i = 0; i < 10; i++) {
			const utxo = await getUTXO(address_from, 0.01, password);
			const ftutxos = await contract.API.fetchFtUTXOs(
				Token.contractTxid,
				address_from,
				ftutxo_codeScript,
			);
			let preTXs: tbc.Transaction[] = [];
			let prepreTxDatas: string[] = [];
			for (let i = 0; i < ftutxos.length; i++) {
				preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId));
				prepreTxDatas.push(
					await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex),
				);
			}
			const txHex = Token.mergeFT(privateKey, ftutxos, utxo, preTXs, prepreTxDatas);
			if (txHex === true) break;
			const txId = await contract.API.broadcastTXraw(txHex as string);
			if (!txId) {
				throw new Error('Failed to broadcast transaction!');
			}
			txids[i] = txId;
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}
		return { txid: txids.join(', ') };
	} catch (error: any) {
		throw new Error(error.message);
	}
};

async function getUTXO(
	address: string,
	tbc_amount: number,
	password: string,
): Promise<tbc.Transaction.IUnspentOutput> {
	try {
		const satoshis_amount = Math.floor(tbc_amount * 1e6);
		let utxos = store.getCurrentAccountUtxos();
		if (!utxos || utxos.length === 0) {
			throw new Error('The balance in the account is zero.');
		}
		let utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
		if (utxo_amount < satoshis_amount) {
			utxos = await fetchUTXOs(address);
			if (!utxos || utxos.length === 0) {
				throw new Error('The balance in the account is zero.');
			}
			await store.updateCurrentAccountUtxos(utxos);
			utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
			if (utxo_amount < satoshis_amount) {
				throw new Error('Insufficient balance.');
			}
		}
		const scriptPubKey = tbc.Script.buildPublicKeyHashOut(address).toBuffer().toString('hex');
		utxos.sort((a, b) => a.satoshis - b.satoshis);
		const largeUTXO = utxos.find((utxo) => utxo.satoshis >= satoshis_amount);
		if (largeUTXO) {
			return {
				txId: largeUTXO.txId,
				outputIndex: largeUTXO.outputIndex,
				satoshis: largeUTXO.satoshis,
				script: scriptPubKey,
			};
		} else {
			const { txHex } = await sendTbc(address, address, 0.001, password);
			const txId = await contract.API.broadcastTXraw(txHex);
			if (txId) {
				return {
					txId,
					outputIndex: 0,
					satoshis: 0.001 * 1e6,
					script: scriptPubKey,
				};
			} else {
				throw new Error('Failed to send TBC.');
			}
		}
	} catch (error: any) {
		throw new Error(error.message);
	}
}
