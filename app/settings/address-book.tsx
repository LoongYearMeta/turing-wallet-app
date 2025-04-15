import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState, useLayoutEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { AddAddressModal } from '@/components/modals/add-address-modal';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import {
	getAllAddressesFromBook,
	getAllMultiSigAddresses,
	removeAddressFromBook,
} from '@/utils/sqlite';

export default function AddressBookScreen() {
	const { t } = useTranslation();
	const navigation = useNavigation();
	const [addresses, setAddresses] = useState<string[]>([]);
	const [multiSigAddresses, setMultiSigAddresses] = useState<string[]>([]);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [addressToDelete, setAddressToDelete] = useState('');
	const { getCurrentAccountAddress } = useAccount();

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: t('addressBook')
		});
	}, [navigation, t]);

	useEffect(() => {
		loadAddresses();
	}, []);

	const loadAddresses = async () => {
		try {
			const bookAddresses = await getAllAddressesFromBook();
			const currentAddress = getCurrentAccountAddress();

			if (!bookAddresses.includes(currentAddress)) {
				setAddresses([currentAddress, ...bookAddresses]);
			} else {
				setAddresses(bookAddresses);
			}

			const multiSigs = await getAllMultiSigAddresses(getCurrentAccountAddress());
			setMultiSigAddresses(multiSigs);
		} catch (error) {
			//console.error('Failed to load addresses:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadAddresses'),
			});
		}
	};

	const handleDeleteAddress = (address: string) => {
		setAddressToDelete(address);
		setShowDeleteModal(true);
	};

	const confirmDeleteAddress = async () => {
		try {
			await removeAddressFromBook(addressToDelete);
			await loadAddresses();
			Toast.show({
				type: 'success',
				text1: t('success'),
				text2: t('addressRemovedFromBook'),
			});
		} catch (error) {
			//console.error('Failed to delete address:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToDeleteAddress'),
			});
		} finally {
			setShowDeleteModal(false);
			setAddressToDelete('');
		}
	};

	const handleCopy = async (text: string, label: string) => {
		await Clipboard.setStringAsync(text);
		Toast.show({
			type: 'success',
			text1: label === 'MultiSig Address' ? t('multiSigAddressCopied') : t('addressCopied'),
		});
	};

	const renderAddressItem = ({ item }: { item: string }) => (
		<View style={styles.addressItem}>
			<View style={{ flex: 1 }}>
				<Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
					{item}
				</Text>
				{item === getCurrentAccountAddress() && (
					<Text style={styles.currentAddressLabel}>{t('currentAccount')}</Text>
				)}
			</View>
			<View style={styles.actionButtons}>
				<TouchableOpacity style={styles.actionButton} onPress={() => handleCopy(item, 'Address')}>
					<Ionicons name="copy-outline" size={20} color="#666" />
				</TouchableOpacity>
				{item !== getCurrentAccountAddress() && (
					<TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteAddress(item)}>
						<Ionicons name="trash-outline" size={20} color="#666" />
					</TouchableOpacity>
				)}
			</View>
		</View>
	);

	const renderMultiSigItem = ({ item }: { item: string }) => (
		<View style={styles.addressItem}>
			<Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
				{item}
			</Text>
			<TouchableOpacity
				style={styles.actionButton}
				onPress={() => handleCopy(item, 'MultiSig Address')}
			>
				<Ionicons name="copy-outline" size={20} color="#666" />
			</TouchableOpacity>
		</View>
	);

	return (
		<View style={styles.container}>
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>{t('addresses')}</Text>
					<TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
						<Ionicons name="add-outline" size={24} color="#000" />
					</TouchableOpacity>
				</View>

				{addresses.length > 0 ? (
					<FlatList
						data={addresses}
						renderItem={renderAddressItem}
						keyExtractor={(item) => item}
						style={styles.list}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
					/>
				) : (
					<Text style={styles.emptyText}>{t('noAddressesInBook')}</Text>
				)}
			</View>

			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>{t('associatedMultiSigAddresses')}</Text>
				</View>

				{multiSigAddresses.length > 0 ? (
					<FlatList
						data={multiSigAddresses}
						renderItem={renderMultiSigItem}
						keyExtractor={(item) => item}
						style={styles.list}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
					/>
				) : (
					<Text style={styles.emptyText}>{t('noAssociatedMultiSigAddresses')}</Text>
				)}
			</View>

			<AddAddressModal
				visible={showAddModal}
				onClose={() => setShowAddModal(false)}
				onAddSuccess={loadAddresses}
			/>

			<ConfirmModal
				visible={showDeleteModal}
				title={t('deleteAddress')}
				message={t('confirmDeleteAddressMessage')}
				onConfirm={confirmDeleteAddress}
				onCancel={() => setShowDeleteModal(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: wp(4),
	},
	section: {
		marginBottom: hp(3),
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: hp(1.5),
	},
	sectionTitle: {
		fontSize: hp(2.4),
		fontWeight: '600',
		color: '#333',
	},
	addButton: {
		padding: wp(1),
	},
	list: {
		maxHeight: hp(25),
	},
	addressItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(3),
		backgroundColor: '#f8f8f8',
	},
	separator: {
		height: 1,
		backgroundColor: '#e0e0e0',
	},
	addressText: {
		fontSize: hp(1.8),
		color: '#333',
		flex: 1,
		paddingRight: wp(2),
	},
	actionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	actionButton: {
		padding: wp(2),
	},
	deleteButton: {
		padding: wp(2),
		marginLeft: wp(2),
	},
	emptyText: {
		textAlign: 'center',
		color: '#999',
		marginTop: hp(2),
		fontSize: hp(1.5),
	},
	currentAddressLabel: {
		fontSize: hp(1.2),
		color: '#007AFF',
		marginTop: hp(0.5),
	},
});
