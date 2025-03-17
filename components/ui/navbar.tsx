import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';

export const Navbar = () => {
	const [menuVisible, setMenuVisible] = useState(false);
	const router = useRouter();
	const { getCurrentAccountAddress } = useAccount();
	const address = getCurrentAccountAddress();

	const menuItems = [
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
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/address-book');
			},
		},
		{
			label: 'Export Mnemonic',
			onPress: () => console.log('Export'),
		},
	];

	return (
		<View style={styles.container}>
			<View style={styles.avatarContainer}>
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
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		height: hp(6),
		paddingHorizontal: wp(5),
		backgroundColor: '#f5f5f5',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		paddingTop: hp(0.5),
	},
	avatarContainer: {
		position: 'relative',
	},
});
