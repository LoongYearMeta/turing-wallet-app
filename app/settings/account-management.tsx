import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ConfirmModal } from '@/components/ui/confirm-modal';
import { Modal } from '@/components/ui/modal';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { AccountType } from '@/types';
import { deleteAccountData, clearAllData } from '@/utils/sqlite';
import { SwitchTypeModal } from '@/components/switch-type-modal';

export default function AccountManagementPage() {
	const { accounts, currentAccount, removeAccount, switchAccount, clear } = useAccount();

	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [deleteAddress, setDeleteAddress] = useState('');
	const [switchAccountsModalVisible, setSwitchAccountsModalVisible] = useState(false);
	const [switchTypeModalVisible, setSwitchTypeModalVisible] = useState(false);

	const handleLongPress = (address: string) => {
		setDeleteAddress(address);
		setDeleteModalVisible(true);
	};

	const handleSwitchAccount = (address: string) => {
		if (address === currentAccount) return;
		switchAccount(address);
	};

	const confirmDelete = async () => {
		try {
			setDeleteModalVisible(false);
			const isCurrentAccount = deleteAddress === currentAccount;

			if (isCurrentAccount) {
				const accountAddresses = Object.keys(accounts);
				const currentIndex = accountAddresses.indexOf(currentAccount);
				const nextAccount =
					accountAddresses[currentIndex + 1] || accountAddresses[currentIndex - 1];

				await deleteAccountData(deleteAddress);
				await removeAccount(deleteAddress);

				if (nextAccount) {
					await switchAccount(nextAccount);
				} else {
					await clearAllData();
					await clear();
					router.replace('/');
				}
			} else {
				await deleteAccountData(deleteAddress);
				await removeAccount(deleteAddress);
			}
		} catch (error) {
			console.error('Failed to delete account:', error);
		}
	};

	const getAccountTypeLabel = (type: AccountType) => {
		switch (type) {
			case AccountType.TBC:
				return 'TBC';
			case AccountType.TAPROOT:
				return 'Taproot';
			case AccountType.TAPROOT_LEGACY:
				return 'Taproot Legacy';
			case AccountType.LEGACY:
				return 'Legacy';
			default:
				return 'Unknown';
		}
	};

	const handleAddAccount = () => {
		router.push('/login');
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.listContainer}>
					{Object.entries(accounts)
						.sort(([address]) => (address === currentAccount ? -1 : 1))
						.map(([address, account]) => (
							<TouchableOpacity
								key={address}
								style={styles.accountItem}
								onPress={() => handleSwitchAccount(address)}
								onLongPress={() => handleLongPress(address)}
								delayLongPress={500}
							>
								<View style={styles.accountInfo}>
									<Text style={styles.accountName}>{account.accountName}</Text>
									<View style={styles.typeContainer}>
										<Text style={styles.accountType}>{getAccountTypeLabel(account.type)}</Text>
										{address === currentAccount && (
											<TouchableOpacity
												style={styles.switchTypeButton}
												onPress={() => setSwitchTypeModalVisible(true)}
											>
												<MaterialIcons name="swap-horiz" size={20} color={theme.colors.primary} />
											</TouchableOpacity>
										)}
									</View>
								</View>
							</TouchableOpacity>
						))}
					<TouchableOpacity style={styles.addAccountItem} onPress={handleAddAccount}>
						<MaterialIcons name="add-circle-outline" size={24} color={theme.colors.primary} />
						<Text style={styles.addAccountText}>Add New Account</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			<ConfirmModal
				visible={deleteModalVisible}
				title="Delete Account"
				message="Are you sure you want to delete this account? This action cannot be undone."
				onConfirm={confirmDelete}
				onCancel={() => setDeleteModalVisible(false)}
			/>

			<Modal
				visible={switchAccountsModalVisible}
				onClose={() => setSwitchAccountsModalVisible(false)}
			>
				<View style={styles.switchAccountsModal}>
					<Text style={styles.modalTitle}>Select Account</Text>
					{Object.entries(accounts)
						.filter(([addr]) => addr !== currentAccount)
						.map(([address, account]) => (
							<TouchableOpacity
								key={address}
								style={styles.modalAccountItem}
								onPress={() => {
									setSwitchAccountsModalVisible(false);
									handleSwitchAccount(address);
								}}
							>
								<Text style={styles.modalAccountName}>{account.accountName}</Text>
								<Text style={styles.modalAccountAddress} numberOfLines={1} ellipsizeMode="middle">
									{address}
								</Text>
							</TouchableOpacity>
						))}
				</View>
			</Modal>

			<SwitchTypeModal
				visible={switchTypeModalVisible}
				onClose={() => setSwitchTypeModalVisible(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollView: {
		flex: 1,
		paddingTop: hp(2),
	},
	listContainer: {
		backgroundColor: '#eeeeee',
	},
	accountItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	accountInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	accountName: {
		fontSize: hp(1.8),
		fontWeight: '500',
	},
	accountType: {
		fontSize: hp(1.6),
		color: theme.colors.primary,
	},
	addAccountItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		gap: wp(2),
	},
	addAccountText: {
		fontSize: hp(1.8),
		color: theme.colors.primary,
	},
	switchAccountsModal: {
		padding: wp(4),
	},
	modalTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
		textAlign: 'center',
	},
	modalAccountItem: {
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	modalAccountName: {
		fontSize: hp(1.8),
		fontWeight: '500',
		marginBottom: hp(0.5),
	},
	modalAccountAddress: {
		fontSize: hp(1.4),
		color: '#666',
	},
	typeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	switchTypeButton: {
		padding: 4,
	},
});
