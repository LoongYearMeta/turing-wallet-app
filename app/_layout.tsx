import {
	OpenSans_400Regular,
	OpenSans_500Medium,
	OpenSans_600SemiBold,
	OpenSans_700Bold,
	OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

import { theme } from '@/constants/theme';
import { initDatabase } from '@/utils/sqlite';
import { SQLiteProvider } from 'expo-sqlite';

SplashScreen.preventAutoHideAsync();

const toastConfig = {
	success: (props: any) => (
		<BaseToast
			{...props}
			style={{
				borderLeftColor: '#4CAF50',
				borderLeftWidth: 6,
				borderRadius: 8,
				backgroundColor: 'white',
				marginHorizontal: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: '600',
				fontFamily: 'OpenSans-SemiBold',
			}}
			text2Style={{
				fontSize: 14,
				fontFamily: 'OpenSans-Regular',
				color: theme.colors.text,
			}}
		/>
	),

	error: (props: any) => (
		<ErrorToast
			{...props}
			style={{
				borderLeftColor: theme.colors.rose,
				borderLeftWidth: 6,
				borderRadius: 8,
				backgroundColor: 'white',
				marginHorizontal: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: '600',
				fontFamily: 'OpenSans-SemiBold',
			}}
			text2Style={{
				fontSize: 14,
				fontFamily: 'OpenSans-Regular',
				color: theme.colors.text,
			}}
		/>
	),

	info: (props: any) => (
		<BaseToast
			{...props}
			style={{
				borderLeftColor: '#2196F3',
				borderLeftWidth: 6,
				borderRadius: 8,
				backgroundColor: 'white',
				marginHorizontal: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: '600',
				fontFamily: 'OpenSans-SemiBold',
			}}
			text2Style={{
				fontSize: 14,
				fontFamily: 'OpenSans-Regular',
				color: theme.colors.text,
			}}
		/>
	),
};

export default function RootLayout() {
	const [fontsLoaded] = useFonts({
		'OpenSans-Regular': OpenSans_400Regular,
		'OpenSans-Medium': OpenSans_500Medium,
		'OpenSans-SemiBold': OpenSans_600SemiBold,
		'OpenSans-Bold': OpenSans_700Bold,
		'OpenSans-ExtraBold': OpenSans_800ExtraBold,
	});

	useEffect(() => {
		if (fontsLoaded) {
			SplashScreen.hideAsync();
		}
	}, [fontsLoaded]);

	if (!fontsLoaded) {
		return null;
	}

	return (
		<SQLiteProvider databaseName="wallet.db" onInit={initDatabase}>
			<StatusBar style="dark" />
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'none',
					contentStyle: {
						flex: 1,
						backgroundColor: 'white',
					},
				}}
			/>
			<Toast config={toastConfig} position="top" topOffset={60} visibilityTime={3000} />
		</SQLiteProvider>
	);
}
