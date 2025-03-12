import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { hp } from '@/helpers/common';

interface AvatarProps {
	address: string;
	onPress: () => void;
}

export const Avatar = ({ address, onPress }: AvatarProps) => {
	// 使用 useMemo 来保证同一个地址总是得到相同的随机字母
	const initial = useMemo(() => {
		// 使用地址作为种子来生成固定的随机字母
		const charCode = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const letterIndex = charCode % 26; // 0-25
		return String.fromCharCode(65 + letterIndex); // 65 是 'A' 的 ASCII 码
	}, [address]);

	return (
		<TouchableOpacity onPress={onPress}>
			<View style={styles.container}>
				<Text style={styles.initial}>{initial}</Text>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		width: hp(4),
		height: hp(4),
		borderRadius: hp(2),
		backgroundColor: theme.colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	initial: {
		color: 'white',
		fontSize: hp(2),
		fontWeight: '600',
	},
});
