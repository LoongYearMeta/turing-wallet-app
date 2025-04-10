import React, { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { hp } from '@/lib/common';

interface KeyboardAvoidingWrapperProps {
	children: ReactNode;
	contentContainerStyle?: object;
	backgroundColor?: string;
}

export const KeyboardAvoidingWrapper = ({
	children,
	contentContainerStyle,
	backgroundColor = 'transparent',
}: KeyboardAvoidingWrapperProps) => {
	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={[styles.container, { backgroundColor }]}
			keyboardVerticalOffset={hp(2)}
		>
			<ScrollView
				contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{children}
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
	},
});
