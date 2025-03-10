import { theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

interface ThemedTextProps extends TextProps {
	variant?: 'body' | 'heading' | 'caption';
	type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
}

export const ThemedText = ({
	children,
	style,
	variant = 'body',
	type,
	...props
}: ThemedTextProps) => {
	let effectiveVariant = variant;

	if (type) {
		switch (type) {
			case 'title':
				effectiveVariant = 'heading';
				break;
			case 'default':
			case 'defaultSemiBold':
			case 'subtitle':
				effectiveVariant = 'body';
				break;
			case 'link':
				effectiveVariant = 'caption';
				break;
		}
	}

	return (
		<Text
			style={[
				styles[effectiveVariant as keyof typeof styles],
				type === 'defaultSemiBold' ? { fontWeight: '600' } : undefined,
				type === 'subtitle' ? { fontSize: 20, fontWeight: 'bold' } : undefined,
				type === 'link' ? { color: '#0a7ea4' } : undefined,
				style,
			]}
			{...props}
		>
			{children}
		</Text>
	);
};

const styles = StyleSheet.create({
	body: {
		fontFamily: 'CustomFont-Regular',
		fontSize: 16,
		color: theme.colors.text,
	},
	heading: {
		fontFamily: 'CustomFont-Bold',
		fontSize: 24,
		color: theme.colors.text,
	},
	caption: {
		fontFamily: 'CustomFont-Regular',
		fontSize: 14,
		color: theme.colors.textLight,
	},
});
