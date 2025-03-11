import '@/shim';
import axios from 'axios';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { getUTXOs } from '@/actions/get-utxos';
import { useAccount } from '@/hooks/useAccount';
import { transferFT_multiSig_create } from '@/lib/ft';
import { sendTbc_multiSig_create } from '@/lib/tbc';
import { finish_transaction } from '@/lib/util';
import { retrieveKeys } from '@/utils/key';
import { getMultiSigPubKeys } from '@/utils/sqlite';

const { getCurrentAccountTbcPubKey } = useAccount();

export async function createMultiSigWallet(
	pubKeys: string[],
	sigCount: number,
	address_from: string,
	password: string,
): Promise<string> {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const utxos = await getUTXOs(address_from, 1.001);
		const txraw = contract.MultiSig.createMultiSigWallet(
			address_from,
			pubKeys,
			sigCount,
			pubKeys.length,
			utxos,
			privateKey,
		);
		const storedUtxos = utxos.map((utxo) => ({
			...utxo,
			height: 0,
			isSpented: false,
		}));
		const txid = await finish_transaction(txraw, storedUtxos);
		if (!txid) {
			throw new Error('Failed to create MultiSig wallet!');
		}
		return contract.MultiSig.getMultiSigAddress(pubKeys, sigCount, pubKeys.length);
	} catch (error: any) {
		throw new Error(error.message);
	}
}

export async function createMultiSigTransaction(
	address_from: string,
	address_to: string,
	amount: number,
	password: string,
	contractId?: string,
) {
	try {
		const url = 'https://turingwallet.xyz/multy/sig/create/history';
		const pubKey = getCurrentAccountTbcPubKey();
		if (!pubKey) {
			throw new Error('No public Key found');
		}
		const pubKeys = await getMultiSigPubKeys(address_from);
		if (!pubKeys) {
			throw new Error('No pubKeys list found');
		}
		if (!contractId) {
			const { multiTxraw, sigs } = await sendTbc_multiSig_create(
				address_from,
				address_to,
				amount,
				password,
			);
			const { txraw, amounts } = multiTxraw;
			const request = {
				unsigned_txid: tbc.crypto.Hash.sha256sha256(Buffer.from(txraw, 'hex')).toString('hex'),
				tx_raw: txraw,
				vin_balance_list: amounts,
				multi_sig_address: address_from,
				ft_contract_id: '',
				ft_decimal: 6,
				balance: amount * 1e6,
				receiver_addresses: [address_to],
				pubkey_list: pubKeys,
				signature_data: {
					pubkey: pubKey,
					sig_list: sigs,
				},
			};
			const response = await axios.post(url, request);

			const { status, message } = response.data;

			if (status !== 0) {
				throw new Error(`Transaction failed: ${message}`);
			}
		} else {
			const { multiSigTxraw, sigs } = await transferFT_multiSig_create(
				contractId,
				address_from,
				address_to,
				amount,
				password,
			);
			const { txraw, amounts } = multiSigTxraw;
			const ft = new contract.FT(contractId);
			const TokenInfo = await contract.API.fetchFtInfo(ft.contractTxid, 'mainnet');
			ft.initialize(TokenInfo);
			const request = {
				unsigned_txid: tbc.crypto.Hash.sha256sha256(Buffer.from(txraw, 'hex')).toString('hex'),
				tx_raw: txraw,
				vin_balance_list: amounts,
				multi_sig_address: address_from,
				ft_contract_id: contractId,
				ft_decimal: ft.decimal,
				balance: amount * Math.pow(10, ft.decimal),
				receiver_addresses: [address_to],
				pubkey_list: pubKeys,
				signature_data: {
					pubkey: pubKey,
					sig_list: sigs,
				},
			};
			const response = await axios.post(url, request);

			const { status, message } = response.data;

			if (status !== 0) {
				throw new Error(`Transaction failed: ${message}`);
			}
		}
	} catch (error: any) {
		throw new Error(error.message);
	}
}
