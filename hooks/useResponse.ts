import '@/shim';
import axios from 'axios';
import { useCallback } from 'react';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { useNftTransaction } from '@/hooks/useNftTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { retrieveKeys } from '@/lib/key';

export interface SendTransactionResponse {
	txid?: string;
	error?: string;
}

export interface SendTransactionRequest {
	flag:
		| 'P2PKH'
		| 'COLLECTION_CREATE'
		| 'NFT_CREATE'
		| 'NFT_TRANSFER'
		| 'FT_MINT'
		| 'FT_TRANSFER'
		| 'POOLNFT_MINT'
		| 'POOLNFT_INIT'
		| 'POOLNFT_LP_INCREASE'
		| 'POOLNFT_LP_CONSUME'
		| 'POOLNFT_SWAP_TO_TOKEN'
		| 'POOLNFT_SWAP_TO_TBC'
		| 'POOLNFT_MERGE'
		| 'FTLP_MERGE';
	satoshis?: number;
	address?: string;
	collection_data?: string;
	ft_data?: string;
	nft_data?: string;
	collection_id?: string;
	nft_contract_address?: string;
	ft_contract_address?: string;
	tbc_amount?: number;
	ft_amount?: number;
	merge_times?: number;
	with_lock?: boolean;
	poolNFT_version?: number;
	serviceFeeRate?: number;
	serverProvider_tag?: string;
}

interface FTData {
	name: string;
	symbol: string;
	decimal: number;
	amount: number;
}

export const useResponse = () => {
	const { getCurrentAccountAddress } = useAccount();
	const { sendTbc, finish_transaction } = useTbcTransaction();
	const { getUTXO, mergeFT, sendFT } = useFtTransaction();
	const { createCollection, createNFT, transferNFT } = useNftTransaction();

	const sendTbcResponse = useCallback(
		async (address_to: string, amount: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await sendTbc(address_from, address_to, amount, password);
				const txid = await finish_transaction(txHex, utxos!);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, sendTbc, finish_transaction],
	);

	const createCollectionResponse = useCallback(
		async (collection_data: contract.CollectionData, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await createCollection(collection_data, address_from, password);
				const txid = await finish_transaction(txHex, utxos!);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, createCollection, finish_transaction],
	);

	const createNFTResponse = useCallback(
		async (collection_id: string, nft_data: contract.NFTData, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await createNFT(collection_id, nft_data, address_from, password);
				const txid = await finish_transaction(txHex, utxos!);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, createNFT, finish_transaction],
	);

	const transferNFTResponse = useCallback(
		async (contract_id: string, address_to: string, transfer_times: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await transferNFT(
					contract_id,
					address_from,
					address_to,
					transfer_times,
					password,
				);
				const txid = await finish_transaction(txHex, utxos!);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, transferNFT, finish_transaction],
	);

	const mintFTResponse = useCallback(
		async (ft_data: FTData, password: string) => {
			try {
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const address_from = getCurrentAccountAddress();
				const utxo = await getUTXO(address_from, 0.01, password);
				const newToken = new contract.FT({
					name: ft_data.name,
					symbol: ft_data.symbol,
					amount: ft_data.amount,
					decimal: ft_data.decimal,
				});
				const [txSourceRaw, txMintRaw] = newToken.MintFT(privateKey, address_from, utxo);
				const txSourceId = await finish_transaction(txSourceRaw, [
					{ ...utxo, height: 0, isSpented: false },
				]);

				if (!txSourceId) {
					return { error: 'broadcast-source-transaction-failed' };
				}
				const txid = await contract.API.broadcastTXraw(txMintRaw);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const transferFTResponse = useCallback(
		async (contract_id: string, address_to: string, amount: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await sendFT(
					contract_id,
					address_from,
					address_to,
					amount,
					password,
				);
				const txid = await finish_transaction(txHex, utxos!);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, sendFT, finish_transaction],
	);

	const mintPoolNFTResponse = useCallback(
		async (
			contractId: string,
			with_lock: boolean,
			poolNFT_version: number,
			serviceFeeRate: number,
			serverProvider_tag: string,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const utxo = await getUTXO(address_from, 0.01, password);
				let txSourceRaw: string = '';
				let txMintRaw: string = '';
				if (poolNFT_version === 1) {
					const pool = new contract.poolNFT({ network: 'mainnet' });
					await pool.initCreate(contractId);
					with_lock
						? ([txSourceRaw, txMintRaw] = await pool.createPoolNftWithLock(privateKey, utxo))
						: ([txSourceRaw, txMintRaw] = await pool.createPoolNFT(privateKey, utxo));
					const txSourceId = await finish_transaction(txSourceRaw, [
						{ ...utxo, height: 0, isSpented: false },
					]);
					if (!txSourceId) {
						return { error: 'broadcast-source-transaction-failed' };
					}
					const txid = await contract.API.broadcastTXraw(txMintRaw);
					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}
					return { txid };
				} else {
					const pool = new contract.poolNFT2({ network: 'mainnet' });
					pool.initCreate(contractId);
					with_lock
						? ([txSourceRaw, txMintRaw] = await pool.createPoolNftWithLock(
								privateKey,
								utxo,
								serverProvider_tag,
								serviceFeeRate,
							))
						: ([txSourceRaw, txMintRaw] = await pool.createPoolNFT(
								privateKey,
								utxo,
								serverProvider_tag,
								serviceFeeRate,
							));
					const txSourceId = await finish_transaction(txSourceRaw, [
						{ ...utxo, height: 0, isSpented: false },
					]);
					if (!txSourceId) {
						return { error: 'broadcast-source-transaction-failed' };
					}
					const txid = await contract.API.broadcastTXraw(txMintRaw);
					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}
					return { txid };
				}
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const initPoolNFTResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			tbc_amount: number,
			ft_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const utxo = await getUTXO(address_from, 0.01, password);
				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const ftUtxo = await getFTUtxoByContractId(
					address_from,
					ft_amount,
					poolUse.ft_a_contractTxid,
				);
				if (!ftUtxo) {
					await mergeFT(poolUse.ft_a_contractTxid, address_from, password);
				}

				const txHex = await poolUse.initPoolNFT(
					privateKey,
					address_to,
					utxo,
					tbc_amount,
					ft_amount,
				);

				const txid = await finish_transaction(txHex, [{ ...utxo, height: 0, isSpented: false }]);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const increaseLPResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			tbc_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			const tbcAmount: number = tbc_amount;
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}

				await poolUse.initfromContractId();
				const ft_amount =
					BigInt(poolUse.ft_a_amount) /
					BigInt(BigInt(poolUse.tbc_amount) / BigInt(Math.floor(tbcAmount * Math.pow(10, 6))));

				const ftUtxoSuit = await getFTUtxoByContractId(
					address_from,
					ft_amount,
					poolUse.ft_a_contractTxid,
				);
				if (!ftUtxoSuit) {
					await mergeFT(poolUse.ft_a_contractTxid, address_from, password);
				}

				const utxo = await getUTXO(address_from, tbcAmount + 0.01, password);
				const txHex = await poolUse.increaseLP(privateKey, address_to, utxo, tbcAmount);
				const txid = await finish_transaction(txHex, [{ ...utxo, height: 0, isSpented: false }]);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, mergeFT, finish_transaction],
	);

	const consumeLPResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			ft_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const utxo = await getUTXO(address_from, 0.01, password);
				let txHex: string = '';

				try {
					txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
				} catch (error: any) {
					if (error.message.includes('Please merge FT-LP UTXOs')) {
						try {
							await mergeFTLPResponse(contractId, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge FT-LP: ' + mergeError.message);
						}
					} else if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
						try {
							await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge poolNFT: ' + mergeError.message);
						}
					} else {
						throw new Error(error.message);
					}
				}

				if (txHex.length === 0) {
					try {
						const utxo = await getUTXO(address_from, 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
					} catch (error: any) {
						if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
							try {
								await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
							} catch (mergeError: any) {
								throw new Error('Failed to merge poolNFT: ' + mergeError.message);
							}
						} else {
							throw new Error(error.message);
						}
					}
				}

				if (txHex.length === 0) {
					try {
						const utxo = await getUTXO(address_from, 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
					} catch (error: any) {
						if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
							try {
								await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
							} catch (mergeError: any) {
								throw new Error('Failed to merge poolNFT: ' + mergeError.message);
							}
						} else {
							throw new Error(error.message);
						}
					}
				}

				if (txHex.length === 0) {
					const utxo = await getUTXO(address_from, 0.01, password);
					await poolUse.initfromContractId();
					txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
				}
				const txid = await finish_transaction(txHex, [{ ...utxo, height: 0, isSpented: false }]);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const swapToTbcResponse = useCallback(
		async (
			poolNft_contractId: string,
			address_to: string,
			ft_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: poolNft_contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: poolNft_contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const ftUtxoSuit = await getFTUtxoByContractId(
					address_from,
					ft_amount,
					poolUse.ft_a_contractTxid,
				);
				if (!ftUtxoSuit) {
					await mergeFT(poolUse.ft_a_contractTxid, address_from, password);
				}

				const utxo = await getUTXO(address_from, 0.01, password);
				let txHex: string = '';
				try {
					txHex = await poolUse.swaptoTBC_baseToken(privateKey, address_to, utxo, ft_amount);
				} catch (error: any) {
					if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
						try {
							await poolNFTMergeResponse(poolNft_contractId, 10, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge poolNFT: ' + mergeError.message);
						}
					} else {
						throw new Error(error.message);
					}
				}

				if (txHex.length === 0) {
					const utxo = await getUTXO(address_from, 0.01, password);
					await poolUse.initfromContractId();
					txHex = await poolUse.swaptoTBC_baseToken(privateKey, address_to, utxo, ft_amount);
				}
				const txid = await finish_transaction(txHex, [{ ...utxo, height: 0, isSpented: false }]);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				console.error('Swap failed:', error);
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, mergeFT, finish_transaction],
	);

	const swapToTokenResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			tbc_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const utxo = await getUTXO(address_from, tbc_amount + 0.01, password);
				let txHex: string = '';
				try {
					txHex = await poolUse.swaptoToken_baseTBC(privateKey, address_to, utxo, tbc_amount);
				} catch (error: any) {
					if (error.message.includes('Insufficient PoolFT, please merge FT UTXOs')) {
						try {
							await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge poolNFT: ' + mergeError.message);
						}
					} else {
						throw new Error(error.message);
					}
				}
				if (txHex.length === 0) {
					const utxo = await getUTXO(address_from, tbc_amount + 0.01, password);
					await poolUse.initfromContractId();
					txHex = await poolUse.swaptoToken_baseTBC(privateKey, address_to, utxo, tbc_amount);
				}
				const txid = await finish_transaction(txHex, [{ ...utxo, height: 0, isSpented: false }]);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, mergeFT, finish_transaction],
	);

	const poolNFTMergeResponse = useCallback(
		async (
			poolNft_contractId: string,
			merge_times: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: poolNft_contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: poolNft_contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();
				let txids: string[] = [];
				for (let i = 0; i < merge_times; i++) {
					const utxo = await getUTXO(address_from, 0.01, password);
					const txHex = await poolUse.mergeFTinPool(privateKey, utxo);
					if (txHex === true) break;
					const txid = await finish_transaction(txHex as string, [
						{ ...utxo, height: 0, isSpented: false },
					]);
					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}

					txids[i] = txid;
					if (i < merge_times - 1) {
						await new Promise((resolve) => setTimeout(resolve, 3000));
					}
				}

				return { txid: txids.join(', ') };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const mergeFTLPResponse = useCallback(
		async (poolNft_contractId: string, poolNFT_version: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const salt = useAccount.getState().getSalt();
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys, salt);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: poolNft_contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: poolNft_contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();
				let txids: string[] = [];
				for (let i = 0; i < 10; i++) {
					const utxo = await getUTXO(address_from, 0.01, password);
					const txHex = await poolUse.mergeFTLP(privateKey, utxo);
					if (txHex === true) break;
					const txid = await finish_transaction(txHex as string, [
						{ ...utxo, height: 0, isSpented: false },
					]);
					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}
					txids[i] = txid;
					await new Promise((resolve) => setTimeout(resolve, 3000));
				}
				return { txid: txids.join(', ') };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const getFTUtxoByContractId = useCallback(
		async (address_from: string, ft_amount: number | BigInt, contract_id: string) => {
			try {
				const { data } = await axios.get(
					`https://turingwallet.xyz/v1/tbc/main/ft/utxo/address/${address_from}/contract/${contract_id}`,
				);
				if (!data) throw new Error('Failed to fetch FT UTXO!');
				const decimal = data.ftUtxoList[0].ftDecimal;
				const totalFtBalance =
					typeof ft_amount === 'number'
						? BigInt(Math.floor(ft_amount * Math.pow(10, decimal)))
						: ft_amount;

				for (let i = 0; i < data.ftUtxoList.length; i++) {
					const ftutxo = data.ftUtxoList[i];
					if (ftutxo.ftBalance > totalFtBalance) {
						return ftutxo;
					}
				}
				return null;
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	return {
		sendTbcResponse,
		createCollectionResponse,
		createNFTResponse,
		transferNFTResponse,
		mintFTResponse,
		transferFTResponse,
		mintPoolNFTResponse,
		initPoolNFTResponse,
		increaseLPResponse,
		consumeLPResponse,
		swapToTbcResponse,
		swapToTokenResponse,
		poolNFTMergeResponse,
		mergeFTLPResponse,
		getFTUtxoByContractId,
	};
};
