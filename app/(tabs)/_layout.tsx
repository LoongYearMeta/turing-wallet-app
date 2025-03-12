import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { theme } from '@/constants/theme';
import { hp } from '@/helpers/common';

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					height: Platform.OS === 'ios' ? hp(10) : hp(8),
					paddingTop: hp(1),
					backgroundColor: '#F5F5F5',
					borderTopWidth: 1,
					borderTopColor: '#E0E0E0',
				},
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: 'rgba(0,0,0,0.4)',
				tabBarLabelStyle: {
					fontSize: hp(1.4),
					fontFamily: theme.fonts.medium,
				},
			}}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: 'Home',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="wallet-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="token"
				options={{
					title: 'Token',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="diamond-outline" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="dapp"
				options={{
					title: 'DApp',
					tabBarIcon: ({ color, size }) => (
						<Ionicons name="grid-outline" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
