import { create } from 'zustand';

import { api } from '@/lib/axios';

interface MultiSigTxSignature {
	pubkey: string;
	sig_list: string[];
}

interface MultiSigTxInfo {
	pubkey_list: string[];
	vin_balance_list: number[];
	receiver_addresses: string[];
	collected_sig_list: MultiSigTxSignature[];
}

export interface MultiSigTransaction {
	unsigned_txid: string;
	txid: string;
	tx_status: number;
	tx_raw: string;
	multi_sig_address: string;
	ft_contract_id: string;
	ft_decimal: number;
	balance: number;
	if_send: boolean;
	json_info: MultiSigTxInfo;
}

interface MultiSigTransactionState {
	completedTxs: MultiSigTransaction[]; // status: 0
	waitBroadcastedTxs: MultiSigTransaction[]; // status: 1
	waitOtherSignTxs: MultiSigTransaction[]; // status: 2
	waitSignedTxs: MultiSigTransaction[]; // status: 3
	totalCount: number;
	currentPage: number;
	isLoading: boolean;
	error: string | null;

	fetchTransactions: (address: string, page: number) => Promise<void>;
	setPage: (page: number) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	reset: () => void;
}

interface MultiSigTransactionResponse {
	status: number;
	message: string;
	history_count: number;
	history_list: MultiSigTransaction[];
}

interface CategorizedTransactions {
	completed: MultiSigTransaction[];
	waitBroadcasted: MultiSigTransaction[];
	waitOtherSign: MultiSigTransaction[];
	waitSigned: MultiSigTransaction[];
}

const useMultiSigTransaction = create<MultiSigTransactionState>((set) => ({
	completedTxs: [],
	waitBroadcastedTxs: [],
	waitOtherSignTxs: [],
	waitSignedTxs: [],
	totalCount: 0,
	currentPage: 0,
	isLoading: false,
	error: null,

	fetchTransactions: async (address: string, page: number) => {
		set({ isLoading: true, error: null });
		try {
			const response = await api.get<MultiSigTransactionResponse>(
				`https://turingwallet.xyz/multy/sig/history/address/${address}/page/${page}/size/50`,
			);
			const { history_count, history_list } = response.data;

			const categorizedTxs = history_list.reduce<CategorizedTransactions>(
				(acc, tx) => {
					switch (tx.tx_status) {
						case 0:
							acc.completed.push(tx);
							break;
						case 1:
							acc.waitBroadcasted.push(tx);
							break;
						case 2:
							acc.waitOtherSign.push(tx);
							break;
						case 3:
							acc.waitSigned.push(tx);
							break;
					}
					return acc;
				},
				{
					completed: [],
					waitBroadcasted: [],
					waitOtherSign: [],
					waitSigned: [],
				},
			);

			set({
				completedTxs: categorizedTxs.completed,
				waitBroadcastedTxs: categorizedTxs.waitBroadcasted,
				waitOtherSignTxs: categorizedTxs.waitOtherSign,
				waitSignedTxs: categorizedTxs.waitSigned,
				totalCount: history_count,
				currentPage: page,
				isLoading: false,
			});
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : 'Failed to fetch transactions',
				isLoading: false,
			});
		}
	},

	setPage: (page: number) => set({ currentPage: page }),

	setLoading: (loading: boolean) => set({ isLoading: loading }),

	setError: (error: string | null) => set({ error }),

	reset: () =>
		set({
			completedTxs: [],
			waitBroadcastedTxs: [],
			waitOtherSignTxs: [],
			waitSignedTxs: [],
			totalCount: 0,
			currentPage: 0,
			isLoading: false,
			error: null,
		}),
}));

export default useMultiSigTransaction;
