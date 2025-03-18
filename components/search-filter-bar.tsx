import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Menu, MenuItem } from 'react-native-material-menu';

import { AddContractModal } from '@/components/add-token-modal';
import { hp, wp } from '@/lib/common';

type SortOption = 'amountHighToLow' | 'amountLowToHigh';
type TabType = 'owned' | 'added';

interface SearchFilterBarProps {
	onTabChange: (tab: 'owned' | 'added') => void;
	onSearch: (text: string) => void;
	onSort?: (option: SortOption) => void;
	onRefresh: () => void;
	onAddToken?: () => void;
}

export const SearchFilterBar = ({
	onTabChange,
	onSearch,
	onSort,
	onRefresh,
	onAddToken,
}: SearchFilterBarProps) => {
	const [searchText, setSearchText] = useState('');
	const [menuVisible, setMenuVisible] = useState(false);
	const [activeTab, setActiveTab] = useState<TabType>('owned');
	const [addModalVisible, setAddModalVisible] = useState(false);

	const handleSearch = (text: string) => {
		setSearchText(text);
		onSearch?.(text);
	};

	const handleSort = (option: SortOption) => {
		onSort?.(option);
		setMenuVisible(false);
	};

	const handleTabPress = (tab: TabType) => {
		setActiveTab(tab);
		onTabChange?.(tab);
	};

	const handleAddModalClose = () => {
		setAddModalVisible(false);
		onAddToken?.();
	};

	return (
		<View style={styles.container}>
			<View style={styles.topRow}>
				<View style={styles.tabContainer}>
					<TouchableOpacity
						style={[styles.tab, activeTab === 'owned' && styles.activeTab]}
						onPress={() => handleTabPress('owned')}
					>
						<Text style={[styles.tabText, activeTab === 'owned' && styles.activeTabText]}>
							Owned
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.tab, activeTab === 'added' && styles.activeTab]}
						onPress={() => handleTabPress('added')}
					>
						<Text style={[styles.tabText, activeTab === 'added' && styles.activeTabText]}>
							Added
						</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.actions}>
					<TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.actionButton}>
						<MaterialIcons name="add" size={24} color="#666" />
					</TouchableOpacity>
					<TouchableOpacity onPress={onRefresh} style={styles.actionButton}>
						<MaterialIcons name="refresh" size={24} color="#666" />
					</TouchableOpacity>
					<Menu
						visible={menuVisible}
						anchor={
							<TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.actionButton}>
								<MaterialIcons name="sort" size={24} color="#666" />
							</TouchableOpacity>
						}
						onRequestClose={() => setMenuVisible(false)}
						style={styles.menu}
					>
						<MenuItem onPress={() => handleSort('amountLowToHigh')} textStyle={styles.menuItemText}>
							<View style={styles.menuItem}>
								<Text style={styles.menuItemText}>Amount</Text>
								<MaterialIcons name="arrow-upward" size={16} color="#333" />
							</View>
						</MenuItem>
						<MenuItem onPress={() => handleSort('amountHighToLow')} textStyle={styles.menuItemText}>
							<View style={styles.menuItem}>
								<Text style={styles.menuItemText}>Amount</Text>
								<MaterialIcons name="arrow-downward" size={16} color="#333" />
							</View>
						</MenuItem>
					</Menu>
				</View>
			</View>
			<View style={styles.searchContainer}>
				<View style={styles.searchWrapper}>
					<MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search by name or ID..."
						value={searchText}
						onChangeText={handleSearch}
						autoCapitalize="none"
						autoCorrect={false}
						contextMenuHidden={false}
						textContentType="none"
						editable={true}
					/>
					{searchText.length > 0 && (
						<TouchableOpacity style={styles.clearButton} onPress={() => handleSearch('')}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
			</View>
			<AddContractModal
				visible={addModalVisible}
				onClose={handleAddModalClose}
				onRefreshLists={onRefresh}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#f5f5f5',
		paddingVertical: hp(1),
		width: '100%',
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: hp(1),
		paddingHorizontal: wp(4),
	},
	tabContainer: {
		flexDirection: 'row',
		borderRadius: 6,
		backgroundColor: '#e8e8e8',
		padding: 2,
	},
	tab: {
		paddingHorizontal: wp(2),
		paddingVertical: hp(0.6),
		borderRadius: 4,
	},
	activeTab: {
		backgroundColor: '#fff',
	},
	tabText: {
		fontSize: hp(1.4),
		color: '#666',
	},
	activeTabText: {
		color: '#000',
		fontWeight: '500',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e8e8e8',
		borderRadius: 8,
		paddingHorizontal: wp(2),
		height: hp(4),
		marginHorizontal: wp(2.5),
		width: wp(80),
	},
	searchWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	searchIcon: {
		marginRight: wp(2),
	},
	searchInput: {
		flex: 1,
		marginLeft: wp(2),
		fontSize: hp(1.6),
		color: '#333',
		paddingRight: wp(8),
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		padding: wp(1),
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	actionButton: {
		padding: 4,
	},
	menu: {
		marginTop: hp(5),
		backgroundColor: '#fff',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	menuItemText: {
		color: '#333',
		fontSize: hp(1.6),
	},
});
