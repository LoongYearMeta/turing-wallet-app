import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function MultiSigssLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				animation: 'slide_from_right',
			}}
		>
			<Stack.Screen
				name="create-multiSig-wallet"
				options={{
					headerTitle: 'Create a new multiSig wallet',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="multiSig-transactions"
				options={{
					headerTitle: 'MultiSig Transactions',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="initiate-multiSig-transaction"
				options={{
					headerTitle: 'Initiate a new multiSig transaction',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
		</Stack>
	);
}

const styles = StyleSheet.create({
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
	},
});
