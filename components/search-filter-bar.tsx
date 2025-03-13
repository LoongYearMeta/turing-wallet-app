import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Menu, MenuItem } from 'react-native-material-menu';

import { AddContractModal } from '@/components/add-token-modal';
import { hp, wp } from '@/helpers/common';

type SortOption = 'priceHighToLow' | 'priceLowToHigh' | 'amountHighToLow' | 'amountLowToHigh';
type TabType = 'owned' | 'added';

interface SearchFilterBarProps {
	onTabChange?: (tab: TabType) => void;
	onSearch?: (text: string) => void;
	onSort?: (option: SortOption) => void;
}

export const SearchFilterBar = ({ onTabChange, onSearch, onSort }: SearchFilterBarProps) => {
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

	const handleAddContract = (contractId: string) => {
		console.log('Adding contract:', contractId);
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
					<TouchableOpacity onPress={() => console.log('refresh')} style={styles.actionButton}>
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
						<MenuItem onPress={() => handleSort('priceHighToLow')} textStyle={styles.menuItemText}>
							<View style={styles.menuItem}>
								<Text style={styles.menuItemText}>Price</Text>
								<MaterialIcons name="arrow-downward" size={16} color="#fff" />
							</View>
						</MenuItem>
						<MenuItem onPress={() => handleSort('priceLowToHigh')} textStyle={styles.menuItemText}>
							<View style={styles.menuItem}>
								<Text style={styles.menuItemText}>Price</Text>
								<MaterialIcons name="arrow-upward" size={16} color="#fff" />
							</View>
						</MenuItem>
						<MenuItem onPress={() => handleSort('amountHighToLow')} textStyle={styles.menuItemText}>
							<View style={styles.menuItem}>
								<Text style={styles.menuItemText}>Amount</Text>
								<MaterialIcons name="arrow-downward" size={16} color="#fff" />
							</View>
						</MenuItem>
						<MenuItem onPress={() => handleSort('amountLowToHigh')} textStyle={styles.menuItemText}>
							<View style={styles.menuItem}>
								<Text style={styles.menuItemText}>Amount</Text>
								<MaterialIcons name="arrow-upward" size={16} color="#fff" />
							</View>
						</MenuItem>
					</Menu>
				</View>
			</View>
			<View style={styles.searchContainer}>
				<MaterialIcons name="search" size={20} color="#666" />
				<TextInput
					style={styles.searchInput}
					placeholder="Search token by ID or name..."
					placeholderTextColor="#999"
					value={searchText}
					onChangeText={handleSearch}
					editable={true}
					autoCapitalize="none"
					autoCorrect={false}
				/>
			</View>
			<AddContractModal
				visible={addModalVisible}
				onClose={() => setAddModalVisible(false)}
				onSubmit={handleAddContract}
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
		marginHorizontal: wp(4),
		width: wp(75),
	},
	searchInput: {
		flex: 1,
		marginLeft: wp(2),
		fontSize: hp(1.6),
		color: '#333',
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
		backgroundColor: '#1A1A1A',
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	menuItemText: {
		color: '#fff',
		fontSize: hp(1.6),
	},
});
