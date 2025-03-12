import '@/shim';
import { useCallback } from 'react';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { fetchUTXOs } from '@/actions/get-utxos';
import { useAccount } from '@/hooks/useAccount';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { getTaprootTweakPrivateKey } from '@/lib/taproot';
import { calculateFee } from '@/lib/util';
import { Transaction } from '@/types';
import { retrieveKeys } from '@/utils/key';
import { getMultiSigPubKeys } from '@/utils/sqlite';
import axios from 'axios';

export const useFtTransaction = () => {
	const {
		isTaprootAccount,
		updateCurrentAccountUtxos,
		getCurrentAccountUtxos,
		getCurrentAccountTbcPubKey,
	} = useAccount();
	const { sendTbc_multiSig_create, sendTbc } = useTbcTransaction();

	const sendFT = useCallback(
		async (
			contractId: string,
			address_from: string,
			address_to: string,
			ft_amount: number,
			password: string,
		): Promise<Transaction> => {
			try {
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				let privateKey: tbc.PrivateKey;
				if (isTaprootAccount()) {
					privateKey = tbc.PrivateKey.fromString(getTaprootTweakPrivateKey(walletWif));
				} else {
					privateKey = tbc.PrivateKey.fromString(walletWif);
				}
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
				if (ftutxos.length === 0) {
					ftutxos = await contract.API.fetchFtUTXOs(
						Token.contractTxid,
						address_from,
						ftutxo_codeScript,
						'mainnet',
						transferTokenAmountBN,
					);
				}
				let preTXs: tbc.Transaction[] = [];
				let prepreTxDatas: string[] = [];
				for (let i = 0; i < ftutxos.length; i++) {
					preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId));
					prepreTxDatas.push(
						await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex),
					);
				}
				const utxo = await getUTXO(address_from, 0.01, password);
				let txHex = '';
				if (address_to.startsWith('1')) {
					txHex = Token.transfer(
						privateKey,
						address_to,
						ft_amount,
						ftutxos,
						utxo,
						preTXs,
						prepreTxDatas,
					);
				} else {
					txHex = contract.MultiSig.p2pkhToMultiSig_transferFT(
						address_from,
						address_to,
						Token,
						ft_amount,
						utxo,
						ftutxos,
						preTXs,
						prepreTxDatas,
						privateKey,
					);
				}

				return {
					txHex,
					fee: calculateFee(txHex),
					address_to,
					utxos: [utxo].map((u) => ({
						...u,
						height: 0,
						isSpented: false,
					})),
				};
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[isTaprootAccount],
	);

	const mergeFT = useCallback(
		async (contractId: string, address_from: string, password: string) => {
			try {
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const Token = new contract.FT(contractId);
				const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
				Token.initialize(TokenInfo);
				const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
					.toBuffer()
					.toString('hex');
				const utxo = await getUTXO(address_from, 0.01, password);
				for (let i = 0; i < 10; i++) {
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
						throw new Error('Failed to merge FT UTXO!');
					}
					await new Promise((resolve) => setTimeout(resolve, 3000));
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const transferFT_multiSig_create = useCallback(
		async (
			contractId: string,
			address_from: string,
			address_to: string,
			ft_amount: number,
			password: string,
		) => {
			try {
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const script_asm = contract.MultiSig.getMultiSigLockScript(address_from);
				const umtxo = await contract.API.fetchUMTXO(script_asm, 'mainnet');
				const Token = new contract.FT(contractId);
				const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid, 'mainnet');
				Token.initialize(TokenInfo);
				const transferTokenAmountBN = BigInt(Math.floor(ft_amount * Math.pow(10, Token.decimal)));
				const hash_from = tbc.crypto.Hash.sha256ripemd160(
					tbc.crypto.Hash.sha256(tbc.Script.fromASM(script_asm).toBuffer()),
				).toString('hex');
				const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, hash_from)
					.toBuffer()
					.toString('hex');
				const ftutxos = await contract.API.fetchFtUTXOS_multiSig(
					Token.contractTxid,
					hash_from,
					ftutxo_codeScript,
					transferTokenAmountBN,
					'mainnet',
				);
				let preTXs: tbc.Transaction[] = [];
				let prepreTxDatas: string[] = [];
				for (let i = 0; i < ftutxos.length; i++) {
					preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId, 'mainnet'));
					prepreTxDatas.push(
						await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex, 'mainnet'),
					);
				}
				const contractTX = await contract.API.fetchTXraw(umtxo.txId, 'mainnet');
				const multiSigTxraw = contract.MultiSig.buildMultiSigTransaction_transferFT(
					address_from,
					address_to,
					Token,
					ft_amount,
					umtxo,
					ftutxos,
					preTXs,
					prepreTxDatas,
					contractTX,
					privateKey,
				);
				const sigs = contract.MultiSig.signMultiSigTransaction_transferFT(
					address_from,
					Token,
					multiSigTxraw,
					privateKey,
				);
				return { multiSigTxraw, sigs };
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const transferFT_multiSig_sign = useCallback(
		async (
			contractId: string,
			multiSigAddress: string,
			multiSigTxraw: contract.MultiSigTxRaw,
			password: string,
		): Promise<string[]> => {
			try {
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const Token = new contract.FT(contractId);
				const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid, 'mainnet');
				Token.initialize(TokenInfo);

				return contract.MultiSig.signMultiSigTransaction_transferFT(
					multiSigAddress,
					Token,
					multiSigTxraw,
					privateKey,
				);
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const transferFT_multiSig_finish = useCallback(
		async (
			multiSigTxraw: contract.MultiSigTxRaw,
			sigs: string[][],
			pubKeys: string[],
		): Promise<string> => {
			try {
				const txraw = contract.MultiSig.finishMultiSigTransaction_transferFT(
					multiSigTxraw.txraw,
					sigs,
					pubKeys,
				);
				const txId = await contract.API.broadcastTXraw(txraw, 'mainnet');
				if (txId) {
					return txId;
				} else {
					throw new Error('Failed to broadcast transaction.');
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const createMultiSigTransaction = useCallback(
		async (
			address_from: string,
			address_to: string,
			amount: number,
			password: string,
			contractId?: string,
		) => {
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
		},
		[getCurrentAccountTbcPubKey, sendTbc_multiSig_create],
	);

	const getUTXO = useCallback(
		async (
			address: string,
			tbc_amount: number,
			password: string,
		): Promise<tbc.Transaction.IUnspentOutput> => {
			try {
				const satoshis_amount = Math.floor(tbc_amount * 1e6);
				let utxos = getCurrentAccountUtxos();
				if (!utxos || utxos.length === 0) {
					throw new Error('The balance in the account is zero.');
				}
				let utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
				if (utxo_amount < satoshis_amount) {
					utxos = await fetchUTXOs(address);
					if (!utxos || utxos.length === 0) {
						throw new Error('The balance in the account is zero.');
					}
					await updateCurrentAccountUtxos(utxos);
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
					const {
						txHex,
						utxos: spentUtxos,
						satoshis,
					} = await sendTbc(address, address, tbc_amount, password);
					const txId = await contract.API.broadcastTXraw(txHex);
					if (txId) {
						let currentUtxos = getCurrentAccountUtxos();
						const updatedUtxos = currentUtxos!.map((utxo) => {
							const isSpent = spentUtxos!.some(
								(spentUtxo) =>
									spentUtxo.txId === utxo.txId && spentUtxo.outputIndex === utxo.outputIndex,
							);
							return isSpent ? { ...utxo, isSpented: true } : utxo;
						});

						await updateCurrentAccountUtxos(updatedUtxos);

						const newUtxo = {
							txId,
							outputIndex: 0,
							satoshis: satoshis!,
							script: scriptPubKey,
						};
						const storedUtxo = {
							...newUtxo,
							height: 0,
							isSpented: false,
						};

						await updateCurrentAccountUtxos([...updatedUtxos, storedUtxo]);

						return newUtxo;
					} else {
						throw new Error('Failed to merge UTXO.');
					}
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[getCurrentAccountUtxos, updateCurrentAccountUtxos, sendTbc],
	);

	return {
		sendFT,
		mergeFT,
		transferFT_multiSig_create,
		transferFT_multiSig_sign,
		transferFT_multiSig_finish,
		getUTXO,
		createMultiSigTransaction,
	};
};
