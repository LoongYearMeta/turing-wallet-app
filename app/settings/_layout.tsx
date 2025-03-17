import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function SettingsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				animation: 'slide_from_right',
			}}
		>
			<Stack.Screen
				name="address-book"
				options={{
					headerTitle: 'Address Book',
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
