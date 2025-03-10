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

SplashScreen.preventAutoHideAsync();

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
		<>
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
		</>
	);
}
