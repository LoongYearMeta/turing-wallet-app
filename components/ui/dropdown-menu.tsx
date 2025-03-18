import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface MenuItem {
	icon: any;
	label: string;
	onPress: () => void;
}

interface DropdownMenuProps {
	visible: boolean;
	onClose: () => void;
	items: MenuItem[];
	address: string;
}

export const DropdownMenu = ({ visible, onClose, items, address }: DropdownMenuProps) => {
	const { getCurrentAccountName } = useAccount();
	const username = getCurrentAccountName();

	const copyToClipboard = async () => {
		await Clipboard.setStringAsync(address);
		Toast.show({
			type: 'success',
			text1: 'Address copied to clipboard',
		});
	};

	const handleClose = useCallback(() => {
		onClose();
	}, [onClose]);

	if (!visible) {
		return null;
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none" // 移除动画
			onRequestClose={handleClose}
		>
			<TouchableOpacity style={styles.overlay} onPress={handleClose} activeOpacity={1}>
				<View style={styles.menuContainer}>
					<View style={styles.header}>
						<Text style={styles.username}>{username}</Text>
						<Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
							{address}
						</Text>
					</View>

					<View style={styles.divider} />

					{items.map((item, index) => (
						<TouchableOpacity
							key={index}
							style={styles.menuItem}
							onPress={() => {
								onClose();
								item.onPress();
							}}
						>
							<View style={styles.iconContainer}>
								<Ionicons name={getIconName(item.label)} size={20} color="white" />
							</View>
							<Text style={styles.menuItemText}>{item.label}</Text>
							<MaterialIcons name="chevron-right" size={20} color="#999" />
						</TouchableOpacity>
					))}
				</View>
			</TouchableOpacity>
		</Modal>
	);
};

// Helper function to map menu items to Ionicons names
const getIconName = (label: string): any => {
	switch (label) {
		case 'Scan QR Code':
			return 'qr-code-outline';
		case 'Information Management':
			return 'information-circle-outline';
		case 'Account Management':
			return 'person-outline';
		case 'System Settings':
			return 'settings-outline';
		case 'Address Book':
			return 'book-outline';
		case 'Export Mnemonic':
			return 'key-outline';
		default:
			return 'ellipsis-horizontal';
	}
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	menuContainer: {
		position: 'absolute',
		top: hp(8),
		right: wp(5),
		backgroundColor: '#1A1A1A',
		borderRadius: theme.radius.md,
		width: wp(50),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		overflow: 'hidden',
	},
	header: {
		padding: hp(1.5),
	},
	username: {
		fontSize: hp(1.8),
		fontWeight: '600',
		color: 'white',
		marginBottom: hp(0.5),
	},
	address: {
		fontSize: hp(1.4),
		color: 'rgba(255,255,255,0.6)',
		flex: 1,
	},
	divider: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.1)',
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingVertical: hp(1.2),
		paddingHorizontal: wp(2),
		height: hp(5),
	},
	iconContainer: {
		width: wp(5),
		alignItems: 'center',
		justifyContent: 'center',
	},
	itemDivider: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.1)',
		marginHorizontal: wp(4),
	},
	menuItemText: {
		fontSize: hp(1.4),
		color: 'white',
		marginLeft: wp(1.5),
		textAlignVertical: 'center',
	},
});
