import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LoginCard } from '@/components/login-card';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

const LoginPage = () => {
	const router = useRouter();

	return (
		<ScreenWrapper bg={'#F0F2F5'}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Create or Restore wallet</Text>
					<Text style={styles.subtitle}>Choose an option to get started</Text>
				</View>

				<View style={styles.cardsContainer}>
					<LoginCard
						title="Create a new wallet"
						description="Start fresh with a new wallet for your digital assets"
						onPress={() => router.push('/create')}
						style={styles.card}
					/>

					<LoginCard
						title="Restore with Mnemonic"
						description="Recover your existing wallet using your recovery phrase"
						onPress={() => router.push('/restore')}
						style={styles.card}
					/>

					<LoginCard
						title="Restore with Private Key"
						description="Recover your existing wallet using your private key"
						onPress={() => router.push('/restore-by-priKey')}
						style={styles.card}
					/>
				</View>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
		paddingTop: hp(6),
	},
	header: {
		marginBottom: hp(3.5),
		paddingLeft: wp(2),
	},
	title: {
		fontSize: hp(3.1),
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: hp(1.5),
	},
	subtitle: {
		fontSize: hp(1.5),
		color: theme.colors.textLight,
	},
	cardsContainer: {
		paddingTop: hp(0),
	},
	card: {
		backgroundColor: '#E8EAED',
	},
});

export default LoginPage;
