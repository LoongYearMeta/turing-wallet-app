import * as SQLite from 'expo-sqlite';

interface SQLiteCallback {
	(error?: Error): void;
}

interface SQLResultSetRowList {
	length: number;
	item(index: number): any;
	_array: any[];
}

interface SQLResultSet {
	insertId?: number;
	rowsAffected: number;
	rows: SQLResultSetRowList;
}

interface SQLError {
	code: number;
	message: string;
}

interface SQLTransaction {
	executeSql(
		sqlStatement: string,
		args?: any[],
		callback?: (transaction: SQLTransaction, resultSet: SQLResultSet) => void,
		errorCallback?: (transaction: SQLTransaction, error: SQLError) => boolean,
	): void;
}

interface Database {
	transaction(
		callback: (transaction: SQLTransaction) => void,
		errorCallback?: (error: SQLError) => void,
		successCallback?: SQLiteCallback,
	): void;
	readTransaction(
		callback: (transaction: SQLTransaction) => void,
		errorCallback?: (error: SQLError) => void,
		successCallback?: SQLiteCallback,
	): void;
}

const db = SQLite.openDatabaseSync('wallet.db') as unknown as Database;

export interface Collection {
	id: string;
	name: string;
	supply: string;
	creator: string;
	icon: string;
	isDeleted: boolean;
}

export interface NFT {
	id: string;
	collection_id: string;
	collection_index: number;
	name: string;
	symbol: string;
	description: string;
	attributes: string;
	transfer_times: number;
	icon: string;
	isDeleted: boolean;
}

export interface FT {
	id: string;
	name: string;
	decimal: number;
	amount: number;
	symbol: string;
	isDeleted: boolean;
}

export interface TransactionHistory {
	id: string;
	send_address: string;
	receive_address: string;
	fee: number;
	timestamp: number;
	type: string;
}

export interface NFTHistory {
	id: string;
	send_address: string;
	receive_address: string;
	fee: number;
	timestamp: number;
	contract_id: string;
	collection_id: string;
	nft_icon: string;
	nft_name: string;
	isDeleted: boolean;
}

class DatabaseManager {
	private static instance: DatabaseManager;

	private constructor() {
		this.initDatabase();
	}

	public static getInstance(): DatabaseManager {
		if (!DatabaseManager.instance) {
			DatabaseManager.instance = new DatabaseManager();
		}
		return DatabaseManager.instance;
	}

	private initDatabase(): void {
		db.transaction((tx: SQLTransaction) => {
			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS Collection (
					id TEXT PRIMARY KEY,
					name TEXT,
					supply TEXT,
					creator TEXT,
					icon TEXT,
					isDeleted BOOLEAN DEFAULT 0
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS NFT (
					id TEXT PRIMARY KEY,
					collection_id TEXT,
					collection_index INTEGER,
					name TEXT,
					symbol TEXT,
					description TEXT,
					attributes TEXT,
					transfer_times INTEGER DEFAULT 0,
					icon TEXT,
					isDeleted BOOLEAN DEFAULT 0,
					FOREIGN KEY (collection_id) REFERENCES Collection (id)
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS FT (
					id TEXT PRIMARY KEY,
					name TEXT,
					decimal INTEGER,
					amount REAL,
					symbol TEXT,
					isDeleted BOOLEAN DEFAULT 0
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS TransactionHistory (
					id TEXT PRIMARY KEY,
					send_address TEXT,
					receive_address TEXT,
					fee REAL,
					timestamp INTEGER,
					type TEXT
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS NFT_History (
					id TEXT PRIMARY KEY,
					send_address TEXT,
					receive_address TEXT,
					fee REAL,
					timestamp INTEGER,
					contract_id TEXT,
					collection_id TEXT,
					nft_icon TEXT,
					nft_name TEXT,
					isDeleted BOOLEAN DEFAULT 0,
					FOREIGN KEY (contract_id) REFERENCES NFT (id)
				);`,
			);
		});
	}

	public async addCollection(collection: Collection): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO Collection (id, name, supply, creator, icon) 
					VALUES (?, ?, ?, ?, ?);`,
					[collection.id, collection.name, collection.supply, collection.creator, collection.icon],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getCollection(id: string): Promise<Collection | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM Collection WHERE id = ? AND isDeleted = 0;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve((_array[0] as Collection) || null);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getAllCollections(): Promise<Collection[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM Collection WHERE isDeleted = 0;',
					[],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array as Collection[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async addNFT(nft: NFT): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO NFT (
						id, collection_id, collection_index, name, symbol, 
						description, attributes, transfer_times, icon
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
					[
						nft.id,
						nft.collection_id,
						nft.collection_index,
						nft.name,
						nft.symbol,
						nft.description,
						nft.attributes,
						nft.transfer_times,
						nft.icon,
					],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getNFTsByCollection(collectionId: string): Promise<NFT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM NFT WHERE collection_id = ? AND isDeleted = 0;',
					[collectionId],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array as NFT[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getNFTWithCollection(
		nftId: string,
	): Promise<{ nft: NFT; collection: Collection } | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`SELECT 
						NFT.*,
						Collection.name as collection_name,
						Collection.supply,
						Collection.creator,
						Collection.icon as collection_icon
					FROM NFT 
					JOIN Collection ON NFT.collection_id = Collection.id 
					WHERE NFT.id = ? AND NFT.isDeleted = 0 AND Collection.isDeleted = 0;`,
					[nftId],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						if (_array.length === 0) {
							resolve(null);
							return;
						}
						const row = _array[0];
						resolve({
							nft: {
								id: row.id,
								collection_id: row.collection_id,
								collection_index: row.collection_index,
								name: row.name,
								symbol: row.symbol,
								description: row.description,
								attributes: row.attributes,
								transfer_times: row.transfer_times,
								icon: row.icon,
								isDeleted: row.isDeleted,
							},
							collection: {
								id: row.collection_id,
								name: row.collection_name,
								supply: row.supply,
								creator: row.creator,
								icon: row.collection_icon,
								isDeleted: row.isDeleted,
							},
						});
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async removeNFT(nftId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'DELETE FROM NFT WHERE id = ?;',
					[nftId],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async updateNFTTransferTimes(nftId: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`UPDATE NFT 
					SET transfer_times = transfer_times + 1 
					WHERE id = ?;`,
					[nftId],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async addFT(ft: FT): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO FT (id, name, decimal, amount, symbol) 
					VALUES (?, ?, ?, ?, ?);`,
					[ft.id, ft.name, ft.decimal, ft.amount, ft.symbol],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getFT(id: string): Promise<FT | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM FT WHERE id = ? AND isDeleted = 0;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve((_array[0] as FT) || null);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getAllFTs(): Promise<FT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM FT WHERE isDeleted = 0;',
					[],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array as FT[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async transferFT(id: string, amount: number): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT amount FROM FT WHERE id = ?;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						if (_array.length === 0) {
							reject(new Error('FT not found'));
							return;
						}

						const currentAmount = _array[0].amount;
						const newAmount = currentAmount - amount;

						if (newAmount < 0) {
							reject(new Error('Insufficient balance'));
							return;
						}

						if (newAmount === 0) {
							tx.executeSql(
								'DELETE FROM FT WHERE id = ?;',
								[id],
								() => resolve(),
								(_: SQLTransaction, error: SQLError) => {
									reject(error);
									return false;
								},
							);
						} else {
							tx.executeSql(
								'UPDATE FT SET amount = ? WHERE id = ?;',
								[newAmount, id],
								() => resolve(),
								(_: SQLTransaction, error: SQLError) => {
									reject(error);
									return false;
								},
							);
						}
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async softDeleteCollection(id: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				// 首先标记合集为已删除
				tx.executeSql(
					'UPDATE Collection SET isDeleted = 1 WHERE id = ?;',
					[id],
					() => {
						// 获取该合集下所有的 NFT id
						tx.executeSql(
							'SELECT id FROM NFT WHERE collection_id = ?;',
							[id],
							(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
								// 标记所有相关 NFT 为已删除
								tx.executeSql(
									'UPDATE NFT SET isDeleted = 1 WHERE collection_id = ?;',
									[id],
									() => {
										// 如果没有相关的 NFT，直接完成
										if (_array.length === 0) {
											resolve();
											return;
										}

										// 获取所有 NFT 的 id
										const nftIds = _array.map((nft: any) => nft.id);

										// 标记所有相关的 NFT 历史记录为已删除
										tx.executeSql(
											`UPDATE NFT_History SET isDeleted = 1 
											WHERE contract_id IN (${nftIds.map(() => '?').join(',')});`,
											nftIds,
											() => resolve(),
											(_: SQLTransaction, error: SQLError) => {
												reject(error);
												return false;
											},
										);
									},
									(_: SQLTransaction, error: SQLError) => {
										reject(error);
										return false;
									},
								);
							},
							(_: SQLTransaction, error: SQLError) => {
								reject(error);
								return false;
							},
						);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async softDeleteNFT(id: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'UPDATE NFT SET isDeleted = 1 WHERE id = ?;',
					[id],
					() => {
						tx.executeSql(
							'UPDATE NFT_History SET isDeleted = 1 WHERE contract_id = ?;',
							[id],
							() => resolve(),
							(_: SQLTransaction, error: SQLError) => {
								reject(error);
								return false;
							},
						);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async softDeleteFT(id: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'UPDATE FT SET isDeleted = 1 WHERE id = ?;',
					[id],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async addTransactionHistory(transaction: TransactionHistory): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO TransactionHistory (
						id, send_address, receive_address, fee, timestamp, type
					) VALUES (?, ?, ?, ?, ?, ?);`,
					[
						transaction.id,
						transaction.send_address,
						transaction.receive_address,
						transaction.fee,
						transaction.timestamp,
						transaction.type,
					],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getTransactionHistoryByType(type: string): Promise<TransactionHistory[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM TransactionHistory WHERE type = ? ORDER BY timestamp DESC;',
					[type],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array as TransactionHistory[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async addNFTHistory(history: NFTHistory): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO NFT_History (
						id, send_address, receive_address, fee, timestamp,
						contract_id, collection_id, nft_icon, nft_name, isDeleted
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
					[
						history.id,
						history.send_address,
						history.receive_address,
						history.fee,
						history.timestamp,
						history.contract_id,
						history.collection_id,
						history.nft_icon,
						history.nft_name,
						history.isDeleted,
					],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getNFTHistoryByContractId(contractId: string): Promise<NFTHistory[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM NFT_History WHERE contract_id = ? AND isDeleted = 0 ORDER BY timestamp DESC;',
					[contractId],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array as NFTHistory[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}
}

export const database = DatabaseManager.getInstance();
