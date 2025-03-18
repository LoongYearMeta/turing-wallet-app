import '@/shim';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { syncFTs } from '@/actions/get-fts';
import { AddContractModal } from '@/components/add-token-modal';
import { BalanceCard } from '@/components/balance-card';
import { SearchFilterBar } from '@/components/search-filter-bar';
import { AddedTokenCard } from '@/components/token-cards/added-token-card';
import { OwnedTokenCard } from '@/components/token-cards/owned-token-card';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp } from '@/lib/common';
import {
	getActiveFTs,
	getAllFTPublics,
	removeFTPublic,
	softDeleteFT,
	type FT,
	type FTPublic,
} from '@/utils/sqlite';

type TabType = 'owned' | 'added';

export default function HomePage() {
	const [activeTab, setActiveTab] = useState<TabType>('owned');
	const [ownedTokens, setOwnedTokens] = useState<FT[]>([]);
	const [addedTokens, setAddedTokens] = useState<FTPublic[]>([]);
	const [searchText, setSearchText] = useState('');
	const { getCurrentAccountAddress } = useAccount();
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [tokenToDelete, setTokenToDelete] = useState<FT | FTPublic | null>(null);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const { refresh } = useLocalSearchParams<{ refresh?: string }>();

	useFocusEffect(
		useCallback(() => {
			if (activeTab === 'owned') {
				loadOwnedTokens();
			} else if (activeTab === 'added' && addedTokens.length === 0) {
				loadAddedTokens();
			}
		}, [activeTab, addedTokens.length]),
	);

	const loadOwnedTokens = async () => {
		try {
			const tokens = await getActiveFTs(getCurrentAccountAddress());
			setOwnedTokens(tokens);
		} catch (error) {
			console.error('Failed to load owned tokens:', error);
		}
	};

	const loadAddedTokens = async () => {
		try {
			const tokens = await getAllFTPublics();
			setAddedTokens(tokens);
		} catch (error) {
			console.error('Failed to load added tokens:', error);
		}
	};

	const handleSort = (option: 'amountHighToLow' | 'amountLowToHigh') => {
		if (activeTab === 'owned') {
			const sorted = [...ownedTokens].sort((a, b) => {
				return option === 'amountHighToLow' ? b.amount - a.amount : a.amount - b.amount;
			});
			setOwnedTokens(sorted);
		} else {
			const sorted = [...addedTokens].sort((a, b) => {
				return option === 'amountHighToLow' ? b.supply - a.supply : a.supply - b.supply;
			});
			setAddedTokens(sorted);
		}
	};

	const handleRefresh = async () => {
		try {
			const address = getCurrentAccountAddress();
			await syncFTs(address);
			if (activeTab === 'owned') {
				await loadOwnedTokens();
			}
		} catch (error) {
			console.error('Failed to refresh tokens:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to refresh tokens',
			});
		}
	};

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		if (tab === 'owned') {
			loadOwnedTokens();
		} else if (tab === 'added' && addedTokens.length === 0) {
			loadAddedTokens();
		}
	};

	const handleSearch = (text: string) => {
		setSearchText(text);
	};

	const handleHistoryPress = (token: FT) => {
		router.push({
			pathname: '/(tabs)/home/token/token-history',
			params: { contractId: token.id },
		});
	};

	const handleTransferPress = (token: FT) => {
		router.push({
			pathname: '/(tabs)/home/token/token-transfer',
			params: { contractId: token.id, amount: token.amount.toString() },
		});
	};

	const handleAddToken = () => {
		if (activeTab === 'added') {
			loadAddedTokens();
		}
	};

	const handleOwnedTokenDelete = (token: FT) => {
		setTokenToDelete(token);
		setDeleteModalVisible(true);
	};

	const handleAddedTokenDelete = (token: FTPublic) => {
		setTokenToDelete(token);
		setDeleteModalVisible(true);
	};

	const handleConfirmDelete = async () => {
		if (!tokenToDelete) return;

		try {
			if ('amount' in tokenToDelete) {
				await softDeleteFT(tokenToDelete.id, getCurrentAccountAddress());
				await loadOwnedTokens();
			} else {
				await removeFTPublic(tokenToDelete.id);
				await loadAddedTokens();
			}
			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'Token deleted successfully',
			});
		} catch (error) {
			console.error('Failed to delete token:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to delete token',
			});
		} finally {
			setDeleteModalVisible(false);
			setTokenToDelete(null);
		}
	};

	const filteredOwnedTokens = React.useMemo(
		() =>
			ownedTokens.filter(
				(token) =>
					token.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
					token.id.toLowerCase().startsWith(searchText.toLowerCase()),
			),
		[ownedTokens, searchText],
	);

	const filteredAddedTokens = React.useMemo(
		() =>
			addedTokens.filter(
				(token) =>
					token.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
					token.id.toLowerCase().startsWith(searchText.toLowerCase()),
			),
		[addedTokens, searchText],
	);

	const handleRefreshLists = async () => {
		if (activeTab === 'owned') {
			await loadOwnedTokens();
		} else {
			await loadAddedTokens();
		}
	};

	const handleAddModalClose = () => {
		setAddModalVisible(false);
	};

	return (
		<ScreenWrapper bg="white">
			<Navbar />
			<ScrollView
				style={styles.container}
				showsVerticalScrollIndicator={false}
				bounces={true}
				decelerationRate="normal"
				overScrollMode="never"
				contentContainerStyle={styles.scrollContent}
			>
				<View style={styles.content}>
					<BalanceCard />
					<SearchFilterBar
						onTabChange={handleTabChange}
						onSearch={handleSearch}
						onSort={handleSort}
						onRefresh={handleRefresh}
						onAddToken={handleAddToken}
					/>
					{activeTab === 'owned'
						? filteredOwnedTokens.map((token) => (
								<OwnedTokenCard
									key={token.id}
									token={token}
									onHistoryPress={handleHistoryPress}
									onTransferPress={handleTransferPress}
									onDeletePress={handleOwnedTokenDelete}
								/>
							))
						: filteredAddedTokens.map((token) => (
								<AddedTokenCard
									key={token.id}
									token={token}
									onDeletePress={handleAddedTokenDelete}
									onRefresh={loadAddedTokens}
								/>
							))}
				</View>
			</ScrollView>
			<ConfirmModal
				visible={deleteModalVisible}
				title="Delete Token"
				message={`Are you sure you want to delete ${
					tokenToDelete?.name || 'this token'
				}? You can restore it from blockchain anytime.`}
				onConfirm={handleConfirmDelete}
				onCancel={() => {
					setDeleteModalVisible(false);
					setTokenToDelete(null);
				}}
			/>
			<AddContractModal
				visible={addModalVisible}
				onClose={handleAddModalClose}
				onRefreshLists={handleRefreshLists}
			/>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: hp(2),
	},
	content: {
		flex: 1,
		alignItems: 'stretch',
		paddingTop: hp(2),
		paddingHorizontal: 16,
	},
});
