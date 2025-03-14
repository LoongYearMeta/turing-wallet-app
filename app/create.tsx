import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import Icon from '@/assets/icons';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { generateKeysEncrypted_mnemonic } from '@/lib/key';
import { theme } from '@/lib/theme';
import { Account, AccountType } from '@/types';

const CreatePage = () => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const { addAccount, setCurrentAccount, setPassKeyAndSalt, getAccountsCount } = useAccount();
	const router = useRouter();

	const validatePassword = (password: string) => {
		const passwordRegex = /^[a-zA-Z0-9]{6,15}$/;
		return passwordRegex.test(password);
	};

	const showToast = (type: 'success' | 'error' | 'info', message: string) => {
		Toast.show({
			type,
			text1: type.charAt(0).toUpperCase() + type.slice(1),
			text2: message,
			position: 'top',
			topOffset: 60,
			visibilityTime: 3000,
		});
	};

	const onSubmit = async () => {
		try {
			if (!password || !confirmPassword) {
				return showToast('error', 'Please fill in all fields');
			}

			if (!validatePassword(password)) {
				return showToast(
					'error',
					'Password must be 6-15 characters and contain only letters and numbers',
				);
			}

			if (password !== confirmPassword) {
				return showToast('error', 'Passwords do not match');
			}

			setLoading(true);

			const result = generateKeysEncrypted_mnemonic(password);
			if (!result) {
				throw new Error('Failed to generate keys');
			}

			const { salt, passKey, encryptedKeys, tbcAddress, pubKey } = result;

			await setPassKeyAndSalt(passKey, salt);

			const accountsCount = getAccountsCount();
			const newAccount: Account = {
				accountName: `Turing ${accountsCount + 1}`,
				addresses: {
					tbcAddress,
				},
				encryptedKeys,
				balance: {
					tbc: 0,
					satoshis: 0,
				},
				pubKey: {
					tbcPubKey: pubKey,
				},
				paymentUtxos: [],
				type: AccountType.TBC,
			};

			await addAccount(newAccount);

			await setCurrentAccount(tbcAddress);

			await new Promise((resolve) => setTimeout(resolve, 100));

			showToast('success', 'Wallet created successfully!');

			setTimeout(() => {
				router.replace('/(tabs)/home');
			}, 1500);
		} catch (error) {
			console.error('Error creating wallet:', error);
			showToast('error', 'Failed to create wallet. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScreenWrapper bg={'white'}>
			<StatusBar style="dark" />
			<View style={styles.container}>
				<View style={styles.content}>
					{/* back button */}
					<View>
						<BackButton router={router} />
					</View>

					{/* welcome */}
					<View>
						<Text style={styles.welcomeText}>Set your password</Text>
					</View>

					{/* form */}
					<View style={styles.form}>
						<Text style={styles.description}>
							Set a password to manage your wallet. This password is unrecoverable. If you forget
							it, you can set a new one by resetting and re-importing your wallet.
						</Text>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Password</Text>
							<Input
								icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
								secureTextEntry
								placeholder="Enter your password"
								placeholderTextColor={theme.colors.textLight}
								value={password}
								onChangeText={setPassword}
							/>
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Confirm Password</Text>
							<Input
								icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
								secureTextEntry
								placeholder="Confirm your password"
								placeholderTextColor={theme.colors.textLight}
								value={confirmPassword}
								onChangeText={setConfirmPassword}
							/>
						</View>
					</View>
				</View>

				<View style={styles.bottomContainer}>
					{/* button */}
					<Button title="Create account" loading={loading} onPress={onSubmit} />
				</View>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
		justifyContent: 'space-between',
	},
	content: {
		gap: 30,
		paddingTop: hp(2),
	},
	welcomeText: {
		fontSize: hp(4),
		fontWeight: '700',
		color: theme.colors.text,
	},
	form: {
		gap: 25,
	},
	input: {
		flexDirection: 'row',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		padding: 18,
		paddingHorizontal: 20,
		gap: 15,
	},
	forgotPassword: {
		textAlign: 'right',
		fontWeight: '600',
		color: theme.colors.text,
	},
	loginText: {
		fontSize: hp(2.1),
		color: 'white',
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	bottomContainer: {
		gap: hp(3),
		marginBottom: hp(4),
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	footerText: {
		color: theme.colors.text,
		fontSize: hp(1.6),
	},
	description: {
		fontSize: hp(1.5),
		color: theme.colors.text,
		marginBottom: hp(2),
	},
	inputGroup: {
		gap: hp(1),
		marginBottom: hp(2),
	},
	label: {
		fontSize: hp(1.6),
		fontWeight: '600',
		color: theme.colors.text,
		marginLeft: wp(2),
	},
});

export default CreatePage;
