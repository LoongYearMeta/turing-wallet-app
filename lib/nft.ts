import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { getUTXOs } from '@/actions/get-utxos';
import { calculateFee } from '@/lib/util';
import { Transaction } from '@/types';
import { retrieveKeys } from '@/utils/key';
import type { Collection, NFT, NFTHistory } from '@/utils/sqlite';
import { database } from '@/utils/sqlite';

export const createCollection = async (
	collection_data: contract.CollectionData,
	address_from: string,
	password: string,
): Promise<Transaction> => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const utxos = await getUTXOs(address_from, 0.05);
		const txraw = contract.NFT.createCollection(address_from, privateKey, collection_data, utxos);
		return {
			txHex: txraw,
			fee: calculateFee(txraw),
			utxos: utxos.map((utxo) => ({
				...utxo,
				height: 0,
				isSpented: false,
			})),
		};
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const createNFT = async (
	collection_id: string,
	nft_data: contract.NFTData,
	address_from: string,
	password: string,
) => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);
		const utxos = await getUTXOs(address_from, 0.05);
		const nfttxo = await contract.API.fetchNFTTXO({
			script: contract.NFT.buildMintScript(address_from).toBuffer().toString('hex'),
			tx_hash: collection_id,
			network: 'mainnet',
		});
		const txraw = contract.NFT.createNFT(
			collection_id,
			address_from,
			privateKey,
			nft_data,
			utxos,
			nfttxo,
		);
		return {
			txHex: txraw,
			fee: calculateFee(txraw),
			utxos: utxos.map((utxo) => ({
				...utxo,
				height: 0,
				isSpented: false,
			})),
		};
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export const transferNFT = async (
	contract_id: string,
	address_from: string,
	address_to: string,
	transfer_times: number,
	password: string,
): Promise<Transaction> => {
	try {
		const { walletWif } = retrieveKeys(password);
		const privateKey = tbc.PrivateKey.fromString(walletWif);

		const nft = new contract.NFT(contract_id);
		const nftInfo = await contract.API.fetchNFTInfo(contract_id, 'mainnet');
		nft.initialize(nftInfo);
		let utxos;
		if (transfer_times === 0) {
			utxos = await getUTXOs(address_from, 0.5);
		} else {
			utxos = await getUTXOs(address_from, 0.05);
		}
		const nfttxo = await contract.API.fetchNFTTXO({
			script: contract.NFT.buildCodeScript(nftInfo.collectionId, nftInfo.collectionIndex)
				.toBuffer()
				.toString('hex'),
			network: 'mainnet',
		});
		const pre_tx = await contract.API.fetchTXraw(nfttxo.txId, 'mainnet');
		const pre_pre_tx = await contract.API.fetchTXraw(
			pre_tx.toObject().inputs[0].prevTxId,
			'mainnet',
		);
		const txraw = nft.transferNFT(address_from, address_to, privateKey, utxos, pre_tx, pre_pre_tx);
		return {
			txHex: txraw,
			fee: calculateFee(txraw),
			address_to,
			utxos: utxos.map((utxo) => ({
				...utxo,
				height: 0,
				isSpented: false,
			})),
		};
	} catch (error: any) {
		throw new Error(error.message);
	}
};

export async function addCollection(collection: Collection, accountAddress: string): Promise<void> {
	try {
		await database.addCollection(collection, accountAddress);
	} catch (error) {
		throw new Error('Failed to add collection');
	}
}

export async function addNFT(nft: NFT, accountAddress: string): Promise<void> {
	try {
		await database.addNFT(nft, accountAddress);
	} catch (error) {
		throw new Error('Failed to add NFT');
	}
}

export async function getNFTsByCollection(
	collectionId: string,
	userAddress: string,
	pagination?: { page: number; pageSize: number },
): Promise<NFT[]> {
	try {
		return await database.getNFTsByCollection(collectionId, userAddress, pagination);
	} catch (error) {
		return [];
	}
}

export async function getNFTWithCollection(
	nftId: string,
): Promise<{ nft: NFT; collection: Collection } | null> {
	try {
		return await database.getNFTWithCollection(nftId);
	} catch (error) {
		return null;
	}
}

export async function removeNFT(nftId: string): Promise<void> {
	try {
		await database.removeNFT(nftId);
	} catch (error) {
		throw new Error('Failed to remove NFT');
	}
}

export async function softDeleteCollection(collectionId: string): Promise<void> {
	try {
		await database.softDeleteCollection(collectionId);
	} catch (error) {
		throw new Error('Failed to delete collection');
	}
}

export async function softDeleteNFT(nftId: string): Promise<void> {
	try {
		await database.softDeleteNFT(nftId);
	} catch (error) {
		throw new Error('Failed to delete NFT');
	}
}

export async function updateNFTTransferTimes(nftId: string): Promise<void> {
	try {
		await database.updateNFTTransferTimes(nftId);
	} catch (error) {
		throw new Error('Failed to update NFT transfer times');
	}
}

export async function getCollection(id: string): Promise<Collection | null> {
	try {
		return await database.getCollection(id);
	} catch (error) {
		return null;
	}
}

export async function getNFT(id: string): Promise<NFT | null> {
	try {
		return await database.getNFT(id);
	} catch (error) {
		return null;
	}
}

export async function getAllCollections(
	userAddress: string,
	pagination?: { page: number; pageSize: number },
): Promise<Collection[]> {
	try {
		return await database.getAllCollections(userAddress, pagination);
	} catch (error) {
		return [];
	}
}

export async function addNFTHistory(history: NFTHistory): Promise<void> {
	try {
		await database.addNFTHistory(history);
	} catch (error) {
		throw new Error('Failed to add NFT history');
	}
}

export async function getNFTHistoryByContractId(
	contractId: string,
	pagination?: { page: number; pageSize: number },
): Promise<NFTHistory[]> {
	try {
		return await database.getNFTHistoryByContractId(contractId, pagination);
	} catch (error) {
		return [];
	}
}

export async function getNFTHistoryById(id: string): Promise<NFTHistory | null> {
	try {
		return await database.getNFTHistoryById(id);
	} catch (error) {
		return null;
	}
}
