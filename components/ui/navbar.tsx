import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hp, wp } from '@/helpers/common';
import { useAccount } from '@/hooks/useAccount';
import { Avatar } from './avatar';
import { DropdownMenu } from './dropdown-menu';

interface NavbarProps {
	title: string;
}

export const Navbar = ({ title }: NavbarProps) => {
	const [menuVisible, setMenuVisible] = useState(false);
	const router = useRouter();
	const { getCurrentAccountAddress } = useAccount();
	const address = getCurrentAccountAddress();

	const menuItems = [
		{
			label: 'Scan QR Code',
			onPress: () => console.log('Scan'),
		},
		{
			label: 'Information Management',
			onPress: () => console.log('Info'),
		},
		{
			label: 'Account Management',
			onPress: () => console.log('Account'),
		},
		{
			label: 'System Settings',
			onPress: () => console.log('Settings'),
		},
		{
			label: 'Address Book',
			onPress: () => console.log('Address'),
		},
		{
			label: 'Export Mnemonic',
			onPress: () => console.log('Export'),
		},
	];

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			<Avatar address={address} onPress={() => setMenuVisible(true)} />
			<DropdownMenu
				visible={menuVisible}
				onClose={() => setMenuVisible(false)}
				items={menuItems.map((item) => ({
					...item,
					icon: null,
				}))}
				address={address}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		height: hp(6),
		paddingHorizontal: wp(5),
		backgroundColor: '#f5f5f5',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		paddingTop: hp(0.5),
	},
	title: {
		fontSize: hp(2.6),
		fontWeight: '600',
		color: '#333333',
		includeFontPadding: false,
		textAlignVertical: 'center',
	},
});
