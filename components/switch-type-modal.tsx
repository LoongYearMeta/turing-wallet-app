import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Modal } from '@/components/ui/modal';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { AccountType } from '@/types';

interface SwitchTypeModalProps {
	visible: boolean;
	onClose: () => void;
}

export const SwitchTypeModal = ({ visible, onClose }: SwitchTypeModalProps) => {
	const {
		getAddresses,
		getCurrentAccountType,
		switchToTBC,
		switchToTaproot,
		switchToTaprootLegacy,
		canSwitchToTbc,
		canSwitchToTaproot,
		canSwitchToTaprootLegacy,
	} = useAccount();

	const addresses = getAddresses();
	const currentType = getCurrentAccountType();

	const handleSwitch = async (type: AccountType) => {
		try {
			switch (type) {
				case AccountType.TBC:
					await switchToTBC();
					break;
				case AccountType.TAPROOT:
					await switchToTaproot();
					break;
				case AccountType.TAPROOT_LEGACY:
					await switchToTaprootLegacy();
					break;
			}
			onClose();
		} catch (error) {
			console.error('Failed to switch account type:', error);
		}
	};

	return (
		<Modal visible={visible} onClose={onClose}>
			<View style={styles.container}>
				<Text style={styles.title}>Switch Account Type</Text>
				{canSwitchToTbc() && (
					<TouchableOpacity
						style={[styles.item, currentType === AccountType.TBC && styles.currentItem]}
						onPress={() => handleSwitch(AccountType.TBC)}
					>
						<View style={styles.itemLeft}>
							<Text style={styles.itemType}>TBC</Text>
							<Text style={styles.itemAddress} numberOfLines={1} ellipsizeMode="middle">
								{addresses.tbcAddress}
							</Text>
						</View>
						{currentType === AccountType.TBC && (
							<MaterialIcons name="check" size={20} color={theme.colors.primary} />
						)}
					</TouchableOpacity>
				)}
				{canSwitchToTaproot() && (
					<TouchableOpacity
						style={[styles.item, currentType === AccountType.TAPROOT && styles.currentItem]}
						onPress={() => handleSwitch(AccountType.TAPROOT)}
					>
						<View style={styles.itemLeft}>
							<Text style={styles.itemType}>Taproot</Text>
							<Text style={styles.itemAddress} numberOfLines={1} ellipsizeMode="middle">
								{addresses.taprootAddress}
							</Text>
						</View>
						{currentType === AccountType.TAPROOT && (
							<MaterialIcons name="check" size={20} color={theme.colors.primary} />
						)}
					</TouchableOpacity>
				)}
				{canSwitchToTaprootLegacy() && (
					<TouchableOpacity
						style={[styles.item, currentType === AccountType.TAPROOT_LEGACY && styles.currentItem]}
						onPress={() => handleSwitch(AccountType.TAPROOT_LEGACY)}
					>
						<View style={styles.itemLeft}>
							<Text style={styles.itemType}>Taproot Legacy</Text>
							<Text style={styles.itemAddress} numberOfLines={1} ellipsizeMode="middle">
								{addresses.taprootLegacyAddress}
							</Text>
						</View>
						{currentType === AccountType.TAPROOT_LEGACY && (
							<MaterialIcons name="check" size={20} color={theme.colors.primary} />
						)}
					</TouchableOpacity>
				)}
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: wp(4),
		width: wp(85),
		alignSelf: 'center',
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
		textAlign: 'center',
	},
	item: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: wp(3),
		paddingHorizontal: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	currentItem: {
		backgroundColor: '#f8f8f8',
	},
	itemLeft: {
		flex: 1,
		marginRight: wp(3),
	},
	itemType: {
		fontSize: hp(1.8),
		fontWeight: '500',
		marginBottom: hp(0.5),
	},
	itemAddress: {
		fontSize: hp(1.4),
		color: '#666',
	},
});
