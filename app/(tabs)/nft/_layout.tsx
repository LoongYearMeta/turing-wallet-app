import { Stack } from 'expo-router';
import React from 'react';

export default function NFTLayout() {
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="collection/create-collection"
				options={{
					headerTitle: 'Create Collection',
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="collection/collection-detail"
				options={{
					headerTitle: 'Collection Detail',
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="create-nft"
				options={{
					headerTitle: 'Create NFT',
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="nft-detail"
				options={{
					headerTitle: 'NFT Detail',
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="nft-history"
				options={{
					headerTitle: 'NFT Detail',
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="nft-transfer"
				options={{
					headerTitle: 'NFT Transfer',
					headerShown: true,
				}}
			/>
		</Stack>
	);
}
