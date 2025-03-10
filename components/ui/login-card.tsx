import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import { hp } from '@/helpers/common';

interface LoginCardProps {
	title: string;
	description: string;
	onPress: () => void;
}

export const LoginCard = ({ title, description, onPress }: LoginCardProps) => {
	return (
		<Pressable
			style={({ pressed }) => [styles.container, pressed && styles.pressed]}
			onPress={onPress}
		>
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.description}>{description}</Text>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: 'white',
		borderRadius: theme.radius.lg,
		padding: hp(3.5),
		marginBottom: hp(3),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	pressed: {
		opacity: 0.9,
		transform: [{ scale: 0.98 }],
	},
	title: {
		fontSize: hp(2.8),
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: hp(1.2),
	},
	description: {
		fontSize: hp(1.4),
		color: theme.colors.textLight,
		lineHeight: hp(2),
	},
});
