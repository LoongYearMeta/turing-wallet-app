import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	Image,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { wp, hp } from '@/lib/common';
import { router } from 'expo-router';
import { useAccount } from '@/hooks/useAccount';
import { getAllDApps } from '@/utils/sqlite';
import { syncDApps } from '@/actions/get-dapps';
import type { DApp } from '@/utils/sqlite';

export default function DAppPage() {
	const [searchText, setSearchText] = useState('');
	const [dapps, setDapps] = useState<DApp[]>([]);
	const [refreshing, setRefreshing] = useState(false);
	const { isTbcAccount, getCurrentAccountType } = useAccount();

	const loadDApps = useCallback(async () => {
		const allDApps = await getAllDApps();
		const filteredDApps = allDApps.filter(
			(dapp) => isTbcAccount() || (!isTbcAccount() && !dapp.if_need_tbc_address),
		);
		setDapps(filteredDApps);
	}, [isTbcAccount]);

	useEffect(() => {
		const accountType = getCurrentAccountType();
		loadDApps();
	}, [getCurrentAccountType(), loadDApps]);

	const onRefresh = async () => {
		try {
			setRefreshing(true);
			await syncDApps();
			await loadDApps();
		} catch (error) {
			console.error('Failed to refresh DApps:', error);
		} finally {
			setRefreshing(false);
		}
	};

	const handleDAppPress = (dapp: DApp) => {
		router.push({
			pathname: '/dapp/webview',
			params: { url: dapp.url, name: dapp.name },
		});
	};

	return (
		<ScreenWrapper bg="#f5f5f5">
			<Navbar />
			<View style={styles.container}>
				<View style={styles.searchContainer}>
					<View style={styles.searchInputContainer}>
						<MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search by name or URL..."
							value={searchText}
							onChangeText={setSearchText}
						/>
						{searchText.length > 0 && (
							<TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
								<MaterialIcons name="close" size={20} color="#999" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				<ScrollView
					style={styles.scrollView}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={['#333']}
							tintColor="#333"
						/>
					}
				>
					<View style={styles.listContainer}>
						{dapps.length > 0 ? (
							dapps.map((dapp) => (
								<TouchableOpacity
									key={dapp.id}
									style={styles.dappItem}
									onPress={() => handleDAppPress(dapp)}
								>
									<Image
										source={{ uri: dapp.icon }}
										style={styles.icon}
										onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
									/>
									<View style={styles.dappInfo}>
										<Text style={styles.name}>{dapp.name}</Text>
										<Text style={styles.description} numberOfLines={1}>
											{dapp.description}
										</Text>
									</View>
								</TouchableOpacity>
							))
						) : (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>
									{searchText ? 'No matching DApps found' : 'No DApps found'}
								</Text>
							</View>
						)}
					</View>
				</ScrollView>
			</View>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	searchContainer: {
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.5),
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
	},
	searchInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eeeeee',
		borderRadius: 8,
		paddingHorizontal: wp(2),
	},
	searchIcon: {
		marginRight: wp(1),
	},
	searchInput: {
		flex: 1,
		height: hp(4.5),
		fontSize: hp(1.6),
	},
	clearButton: {
		padding: wp(1),
	},
	scrollView: {
		flex: 1,
		paddingTop: hp(1),
	},
	listContainer: {
		backgroundColor: '#f5f5f5',
	},
	dappItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#f5f5f5',
	},
	icon: {
		width: wp(10),
		height: wp(10),
		borderRadius: wp(2),
	},
	dappInfo: {
		flex: 1,
		marginLeft: wp(3),
	},
	name: {
		fontSize: hp(1.8),
		fontWeight: '500',
		marginBottom: hp(0.5),
		color: '#000',
	},
	description: {
		fontSize: hp(1.4),
		color: '#666',
	},
	emptyContainer: {
		padding: wp(4),
		alignItems: 'center',
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
	},
});
