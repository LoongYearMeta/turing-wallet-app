import { Stack } from 'expo-router';
import React from 'react';

export default function HomeLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="token/token-history"
				options={{
					headerTitle: 'Token History',
					presentation: 'card',
					headerShown: true,
				}}
			/>
		</Stack>
	);
}
