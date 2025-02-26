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

export interface User {
	address: string;
}

export interface Collection {
	id: string;
	name: string;
	supply: number;
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
	collection_name: string;
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
	balance_change: number;
}

export interface NFTHistory {
	id: string;
	send_address: string;
	receive_address: string;
	timestamp: number;
	contract_id: string;
}

export interface FTHistory {
	id: string;
	send_address: string;
	receive_address: string;
	fee: number;
	timestamp: number;
	contract_id: string;
	balance_change: number;
}

export interface MultiSig {
	multiSig_address: string;
	pubKeys: string[];
	isDeleted: boolean;
}

interface PaginationParams {
	page: number;
	pageSize: number;
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
				`CREATE TABLE IF NOT EXISTS User (
					address TEXT PRIMARY KEY
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS Collection (
					id TEXT PRIMARY KEY,
					name TEXT,
					supply INTEGER,
					creator TEXT,
					icon TEXT,
					isDeleted BOOLEAN DEFAULT 0,
					user_address TEXT,
					FOREIGN KEY (user_address) REFERENCES User (address)
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
					collection_name TEXT,
					isDeleted BOOLEAN DEFAULT 0,
					user_address TEXT,
					FOREIGN KEY (collection_id) REFERENCES Collection (id),
					FOREIGN KEY (user_address) REFERENCES User (address)
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS FT (
					id TEXT PRIMARY KEY,
					name TEXT,
					decimal INTEGER,
					amount REAL,
					symbol TEXT,
					isDeleted BOOLEAN DEFAULT 0,
					user_address TEXT,
					FOREIGN KEY (user_address) REFERENCES User (address)
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS TransactionHistory (
					id TEXT PRIMARY KEY,
					send_address TEXT,
					receive_address TEXT,
					fee REAL,
					timestamp INTEGER,
					type TEXT,
					balance_change REAL,
					user_address TEXT,
					FOREIGN KEY (user_address) REFERENCES User (address)
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS NFT_History (
					id TEXT PRIMARY KEY,
					send_address TEXT,
					receive_address TEXT,
					timestamp INTEGER,
					contract_id TEXT,
					FOREIGN KEY (contract_id) REFERENCES NFT (id)
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS FT_History (
					id TEXT PRIMARY KEY,
					send_address TEXT,
					receive_address TEXT,
					fee REAL,
					timestamp INTEGER,
					contract_id TEXT,
					balance_change REAL,
					FOREIGN KEY (contract_id) REFERENCES FT (id)
				);`,
			);

			tx.executeSql(
				`CREATE TABLE IF NOT EXISTS MultiSig (
					multiSig_address TEXT PRIMARY KEY,
					pubKeys TEXT,
					isDeleted BOOLEAN DEFAULT 0,
					user_address TEXT,
					FOREIGN KEY (user_address) REFERENCES User (address)
				);`,
			);
		});
	}

	public async addUser(address: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'INSERT OR REPLACE INTO User (address) VALUES (?);',
					[address],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async deleteUserData(address: string): Promise<void> {
		return new Promise<void>((resolve, reject: (error: Error | SQLError) => void) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT id FROM NFT WHERE user_address = ?;',
					[address],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						if (_array.length > 0) {
							const nftIds = _array.map((nft: any) => nft.id);
							tx.executeSql(
								`DELETE FROM NFT_History 
								WHERE contract_id IN (${nftIds.map(() => '?').join(',')});`,
								nftIds,
								() => {
									tx.executeSql(
										'SELECT id FROM FT WHERE user_address = ?;',
										[address],
										(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
											if (_array.length > 0) {
												const ftIds = _array.map((ft: any) => ft.id);
												tx.executeSql(
													`DELETE FROM FT_History 
													WHERE contract_id IN (${ftIds.map(() => '?').join(',')});`,
													ftIds,
													() => this.deleteUserRecords(tx, address, resolve, reject),
													(_: SQLTransaction, error: SQLError) => {
														reject(error);
														return false;
													},
												);
											} else {
												this.deleteUserRecords(tx, address, resolve, reject);
											}
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
						} else {
							tx.executeSql(
								'SELECT id FROM FT WHERE user_address = ?;',
								[address],
								(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
									if (_array.length > 0) {
										const ftIds = _array.map((ft: any) => ft.id);
										tx.executeSql(
											`DELETE FROM FT_History 
											WHERE contract_id IN (${ftIds.map(() => '?').join(',')});`,
											ftIds,
											() => this.deleteUserRecords(tx, address, resolve, reject),
											(_: SQLTransaction, error: SQLError) => {
												reject(error);
												return false;
											},
										);
									} else {
										this.deleteUserRecords(tx, address, resolve, reject);
									}
								},
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

	private deleteUserRecords(
		tx: SQLTransaction,
		address: string,
		resolve: () => void,
		reject: (error: Error | SQLError) => void,
	): void {
		tx.executeSql(
			'DELETE FROM TransactionHistory WHERE user_address = ?;',
			[address],
			() => {
				tx.executeSql(
					'DELETE FROM NFT WHERE user_address = ?;',
					[address],
					() => {
						tx.executeSql(
							'DELETE FROM FT WHERE user_address = ?;',
							[address],
							() => {
								tx.executeSql(
									'DELETE FROM Collection WHERE user_address = ?;',
									[address],
									() => {
										tx.executeSql(
											'DELETE FROM User WHERE address = ?;',
											[address],
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
			},
			(_: SQLTransaction, error: SQLError) => {
				reject(error);
				return false;
			},
		);
	}

	public async addCollection(collection: Collection, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO Collection (
						id, name, supply, creator, icon, user_address, isDeleted
					) VALUES (?, ?, ?, ?, ?, ?, 0);`,
					[
						collection.id,
						collection.name,
						collection.supply,
						collection.creator,
						collection.icon,
						userAddress,
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

	public async getCollection(id: string): Promise<Collection | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM Collection WHERE id = ?;',
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

	public async getAllCollections(
		userAddress: string,
		pagination?: PaginationParams,
	): Promise<Collection[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query = 'SELECT * FROM Collection WHERE user_address = ? AND isDeleted = 0';
				const params: any[] = [userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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

	public async addNFT(nft: NFT, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO NFT (
						id, collection_id, collection_index, name, symbol,
						description, attributes, transfer_times, icon,
						collection_name, isDeleted, user_address
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
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
						nft.collection_name,
						userAddress,
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

	public async getNFTsByCollection(
		collectionId: string,
		userAddress: string,
		pagination?: PaginationParams,
	): Promise<NFT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query =
					'SELECT * FROM NFT WHERE collection_id = ? AND user_address = ? AND isDeleted = 0';
				const params: any[] = [collectionId, userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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
								collection_name: row.collection_name,
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

	public async updateNFTTransferTimes(nftId: string, transferTimes: number): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'UPDATE NFT SET transfer_times = ? WHERE id = ?;',
					[transferTimes, nftId],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getNFT(id: string): Promise<NFT | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM NFT WHERE id = ?;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve((_array[0] as NFT) || null);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async upsertFT(ft: FT, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT id FROM FT WHERE id = ? AND user_address = ?;',
					[ft.id, userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						if (_array.length > 0) {
							tx.executeSql(
								`UPDATE FT SET 
									name = ?, 
									decimal = ?, 
									amount = ?, 
									symbol = ?
									WHERE id = ? AND user_address = ?;`,
								[ft.name, ft.decimal, ft.amount, ft.symbol, ft.id, userAddress],
								() => resolve(),
								(_: SQLTransaction, error: SQLError) => {
									reject(error);
									return false;
								},
							);
						} else {
							tx.executeSql(
								`INSERT INTO FT (
									id, name, decimal, amount, symbol, isDeleted, user_address
								) VALUES (?, ?, ?, ?, ?, ?, ?);`,
								[ft.id, ft.name, ft.decimal, ft.amount, ft.symbol, false, userAddress],
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

	public async getFT(id: string, userAddress: string): Promise<FT | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM FT WHERE id = ? AND user_address = ?;',
					[id, userAddress],
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

	public async transferFT(id: string, amount: number, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT amount FROM FT WHERE id = ? AND user_address = ? AND isDeleted = 0;',
					[id, userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						if (_array.length === 0) {
							reject(new Error('FT not found'));
							return;
						}

						const currentAmount = _array[0].amount;
						const newAmount = currentAmount + amount;

						if (newAmount < 0) {
							reject(new Error('Insufficient FT balance'));
							return;
						}

						if (newAmount === 0) {
							tx.executeSql(
								'DELETE FROM FT WHERE id = ? AND user_address = ?;',
								[id, userAddress],
								() => resolve(),
								(_: SQLTransaction, error: SQLError) => {
									reject(error);
									return false;
								},
							);
						} else {
							tx.executeSql(
								'UPDATE FT SET amount = ? WHERE id = ? AND user_address = ? AND isDeleted = 0;',
								[newAmount, id, userAddress],
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
				tx.executeSql(
					'UPDATE Collection SET isDeleted = 1 WHERE id = ?;',
					[id],
					() => {
						tx.executeSql(
							'UPDATE NFT SET isDeleted = 1 WHERE collection_id = ?;',
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

	public async softDeleteNFT(id: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'UPDATE NFT SET isDeleted = 1 WHERE id = ?;',
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

	public async softDeleteFT(id: string, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'UPDATE FT SET isDeleted = 1 WHERE id = ? AND user_address = ?;',
					[id, userAddress],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async addTransactionHistory(
		history: TransactionHistory,
		userAddress: string,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO TransactionHistory (
						id, send_address, receive_address, fee, timestamp, type, balance_change, user_address
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
					[
						history.id,
						history.send_address,
						history.receive_address,
						history.fee,
						history.timestamp,
						history.type,
						history.balance_change,
						userAddress,
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

	public async getTransactionHistoryByType(
		type: string,
		userAddress: string,
		pagination?: PaginationParams,
	): Promise<TransactionHistory[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query =
					'SELECT * FROM TransactionHistory WHERE type = ? AND user_address = ? ORDER BY timestamp DESC';
				const params: any[] = [type, userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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
						id, send_address, receive_address, timestamp, contract_id
					) VALUES (?, ?, ?, ?, ?);`,
					[
						history.id,
						history.send_address,
						history.receive_address,
						history.timestamp,
						history.contract_id,
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
					'SELECT * FROM NFT_History WHERE contract_id = ? ORDER BY timestamp DESC;',
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

	public async addFTHistory(history: FTHistory): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO FT_History (
						id, send_address, receive_address, fee, timestamp, contract_id, balance_change
					) VALUES (?, ?, ?, ?, ?, ?, ?);`,
					[
						history.id,
						history.send_address,
						history.receive_address,
						history.fee,
						history.timestamp,
						history.contract_id,
						history.balance_change,
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

	public async getFTHistoryByContractId(
		contractId: string,
		pagination?: PaginationParams,
	): Promise<FTHistory[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query = 'SELECT * FROM FT_History WHERE contract_id = ? ORDER BY timestamp DESC';
				const params: any[] = [contractId];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array as FTHistory[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getTransactionHistoryById(id: string): Promise<TransactionHistory | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM TransactionHistory WHERE id = ?;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve((_array[0] as TransactionHistory) || null);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getNFTHistoryById(id: string): Promise<NFTHistory | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM NFT_History WHERE id = ?;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve((_array[0] as NFTHistory) || null);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getFTHistoryById(id: string): Promise<FTHistory | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT * FROM FT_History WHERE id = ?;',
					[id],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve((_array[0] as FTHistory) || null);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async addMultiSig(multiSig: MultiSig, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (multiSig.pubKeys.length < 3 || multiSig.pubKeys.length > 10) {
				reject(new Error('Public keys count must be between 3 and 10'));
				return;
			}

			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					`INSERT OR REPLACE INTO MultiSig (
						multiSig_address, pubKeys, isDeleted, user_address
					) VALUES (?, ?, 0, ?);`,
					[multiSig.multiSig_address, JSON.stringify(multiSig.pubKeys), userAddress],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async softDeleteMultiSig(multiSigAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'UPDATE MultiSig SET isDeleted = 1 WHERE multiSig_address = ?;',
					[multiSigAddress],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getActiveMultiSigs(userAddress: string): Promise<MultiSig[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT multiSig_address, pubKeys FROM MultiSig WHERE user_address = ? AND isDeleted = 0;',
					[userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						const multiSigs = _array.map((row) => ({
							...row,
							pubKeys: JSON.parse(row.pubKeys),
						}));
						resolve(multiSigs as MultiSig[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getAllMultiSigs(userAddress: string): Promise<MultiSig[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT multiSig_address, pubKeys, isDeleted FROM MultiSig WHERE user_address = ?;',
					[userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						const multiSigs = _array.map((row) => ({
							...row,
							pubKeys: JSON.parse(row.pubKeys),
						}));
						resolve(multiSigs as MultiSig[]);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getMultiSigPubKeys(multiSigAddress: string): Promise<string[] | null> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT pubKeys FROM MultiSig WHERE multiSig_address = ?;',
					[multiSigAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						if (_array.length === 0) {
							resolve(null);
							return;
						}
						try {
							const pubKeys = JSON.parse(_array[0].pubKeys);
							resolve(pubKeys);
						} catch {
							reject(new Error('Invalid pubKeys format'));
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

	public async getTransactionHistoryCount(userAddress: string): Promise<number> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT COUNT(*) as count FROM TransactionHistory WHERE user_address = ?;',
					[userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array[0].count);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getCollectionCount(userAddress: string): Promise<number> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT COUNT(*) as count FROM Collection WHERE user_address = ? AND isDeleted = 0;',
					[userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array[0].count);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getNFTCount(userAddress: string): Promise<number> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'SELECT COUNT(*) as count FROM NFT WHERE user_address = ? AND isDeleted = 0;',
					[userAddress],
					(_: SQLTransaction, { rows: { _array } }: SQLResultSet) => {
						resolve(_array[0].count);
					},
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async removeFT(id: string, userAddress: string): Promise<void> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				tx.executeSql(
					'DELETE FROM FT WHERE id = ? AND user_address = ?;',
					[id, userAddress],
					() => resolve(),
					(_: SQLTransaction, error: SQLError) => {
						reject(error);
						return false;
					},
				);
			});
		});
	}

	public async getActiveNFTs(
		userAddress: string,
		pagination?: { page: number; pageSize: number },
	): Promise<NFT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query = 'SELECT * FROM NFT WHERE user_address = ? AND isDeleted = 0';
				const params: any[] = [userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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

	public async getAllNFTs(
		userAddress: string,
		pagination?: { page: number; pageSize: number },
	): Promise<NFT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query = 'SELECT * FROM NFT WHERE user_address = ?';
				const params: any[] = [userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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

	public async getActiveFTs(
		userAddress: string,
		pagination?: { page: number; pageSize: number },
	): Promise<FT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query = 'SELECT * FROM FT WHERE user_address = ? AND isDeleted = 0';
				const params: any[] = [userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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

	public async getAllFTs(
		userAddress: string,
		pagination?: { page: number; pageSize: number },
	): Promise<FT[]> {
		return new Promise((resolve, reject) => {
			db.transaction((tx: SQLTransaction) => {
				let query = 'SELECT * FROM FT WHERE user_address = ?';
				const params: any[] = [userAddress];

				if (pagination) {
					const offset = pagination.page * pagination.pageSize;
					query += ' LIMIT ? OFFSET ?';
					params.push(pagination.pageSize, offset);
				}

				tx.executeSql(
					query,
					params,
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
}

export const database = DatabaseManager.getInstance();
