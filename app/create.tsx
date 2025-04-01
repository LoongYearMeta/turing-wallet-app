import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	InteractionManager,
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ScrollView,
} from 'react-native';
import Toast from 'react-native-toast-message';

import Icon from '@/assets/icons';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { generateKeysEncrypted_mnemonic, verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { Account, AccountType } from '@/types';

const CreatePage = () => {
	const { getPassKey, getSalt } = useAccount();
	const passKey = getPassKey();
	const salt = getSalt();
	const initialHasAccount = React.useRef(passKey && salt).current;

	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
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

	const onSubmit = () => {
		if (isSubmitting) return;

		setIsSubmitting(true);

		requestAnimationFrame(() => {
			InteractionManager.runAfterInteractions(() => {
				validateAndSubmitForm();
			});
		});
	};

	const validateAndSubmitForm = async () => {
		try {
			if (initialHasAccount) {
				if (!confirmPassword) {
					showToast('error', 'Please enter your password');
					setIsSubmitting(false);
					return;
				}
				if (!verifyPassword(confirmPassword, passKey, salt)) {
					showToast('error', 'Incorrect password');
					setIsSubmitting(false);
					return;
				}
				setPassword(confirmPassword);
			} else {
				if (!password || !confirmPassword) {
					showToast('error', 'Please fill in all fields');
					setIsSubmitting(false);
					return;
				}
				if (!validatePassword(password)) {
					showToast(
						'error',
						'Password must be 6-15 characters and contain only letters and numbers',
					);
					setIsSubmitting(false);
					return;
				}
				if (password !== confirmPassword) {
					showToast('error', 'Passwords do not match');
					setIsSubmitting(false);
					return;
				}
			}

			setLoading(true);

			if (initialHasAccount) {
				const result = generateKeysEncrypted_mnemonic(password, salt);
				if (!result) {
					throw new Error('Failed to generate keys');
				}

				const {
					encryptedKeys,
					tbcAddress,
					pubKey,
					taprootAddress,
					taprootLegacyAddress,
					legacyAddress,
				} = result;

				const accountsCount = getAccountsCount();
				const newAccount: Account = {
					accountName: `Wallet ${accountsCount + 1}`,
					addresses: {
						tbcAddress,
						taprootAddress,
						taprootLegacyAddress,
						legacyAddress,
					},
					encryptedKeys,
					balance: {
						tbc: 0,
						btc: 0,
					},
					pubKey: {
						tbcPubKey: pubKey,
					},
					paymentUtxos: [],
					type: AccountType.TBC,
				};

				await addAccount(newAccount);
				await setCurrentAccount(tbcAddress);
			} else {
				const result = generateKeysEncrypted_mnemonic(password);
				if (!result) {
					throw new Error('Failed to generate keys');
				}

				const {
					salt,
					passKey,
					encryptedKeys,
					tbcAddress,
					pubKey,
					taprootAddress,
					taprootLegacyAddress,
					legacyAddress,
				} = result;

				const accountsCount = getAccountsCount();
				const newAccount: Account = {
					accountName: `Wallet ${accountsCount + 1}`,
					addresses: {
						tbcAddress,
						taprootAddress,
						taprootLegacyAddress,
						legacyAddress,
					},
					encryptedKeys,
					balance: {
						tbc: 0,
						btc: 0,
					},
					pubKey: {
						tbcPubKey: pubKey,
					},
					paymentUtxos: [],
					type: AccountType.TBC,
				};
				await setPassKeyAndSalt(passKey, salt);
				await addAccount(newAccount);
				await setCurrentAccount(tbcAddress);
			}

			router.replace('/(tabs)/home');
			showToast('success', 'Wallet created successfully!');
		} catch (error) {
			console.error('Error creating wallet:', error);
			showToast('error', 'Failed to create wallet. Please try again.');
		} finally {
			setLoading(false);
			setIsSubmitting(false);
		}
	};

	const isButtonDisabled = loading || isSubmitting;

	const buttonStyle = [
		styles.button,
		isSubmitting && styles.buttonSubmitting,
		loading && styles.buttonLoading,
	];

	return (
		<ScreenWrapper bg={'white'}>
			<StatusBar style="dark" />
			{loading ? (
				<View style={styles.loadingContent}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>Creating your wallet, please wait...</Text>
				</View>
			) : (
				<ScrollView
					style={styles.content}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.contentContainer}
					bounces={true}
				>
					<View style={styles.container}>
						<View>
							<Text style={styles.welcomeText}>
								{initialHasAccount ? 'Confirm Password' : 'Set your password'}
							</Text>
						</View>

						<View style={styles.form}>
							{!initialHasAccount && (
								<Text style={styles.description}>
									Please set a password to protect your wallet. Once you forget it, you can set a
									new one by resetting and re-importing your wallet.
								</Text>
							)}

							{!initialHasAccount ? (
								<View style={styles.inputGroup}>
									<Text style={styles.label}>Password</Text>
									<Input
										icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
										secureTextEntry
										placeholder="Set your password"
										value={password}
										onChangeText={setPassword}
										editable={!isButtonDisabled}
									/>
								</View>
							) : null}

							<View style={styles.inputGroup}>
								<Text style={styles.label}>
									{initialHasAccount ? 'Password' : 'Confirm Password'}
								</Text>
								<Input
									icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
									secureTextEntry
									placeholder={initialHasAccount ? 'Enter your password' : 'Confirm your password'}
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									editable={!isButtonDisabled}
								/>
							</View>
						</View>

						<TouchableOpacity
							style={buttonStyle}
							onPress={onSubmit}
							disabled={isButtonDisabled}
							activeOpacity={0.5}
							pressRetentionOffset={{ top: 10, left: 10, bottom: 10, right: 10 }}
						>
							<Text style={styles.buttonText}>Create account</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			)}
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		paddingTop: hp(4),
	},
	welcomeText: {
		fontSize: hp(2.8),
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: hp(2),
	},
	form: {
		gap: hp(2),
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
		paddingHorizontal: wp(2),
		paddingBottom: hp(4),
		backgroundColor: 'white',
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
	disabledButton: {
		opacity: 0.7,
		backgroundColor: theme.colors.primary,
	},
	button: {
		backgroundColor: theme.colors.primary,
		height: hp(6.6),
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: theme.radius.xl,
		borderCurve: 'continuous',
		marginTop: hp(3),
	},
	buttonSubmitting: {
		backgroundColor: '#999',
	},
	buttonLoading: {
		backgroundColor: '#999',
	},
	buttonText: {
		fontSize: hp(2.5),
		color: 'white',
		fontWeight: '700',
	},
	loadingContent: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: hp(3),
	},
	loadingText: {
		fontSize: hp(1.8),
		color: theme.colors.text,
		textAlign: 'center',
		marginHorizontal: wp(10),
	},
});

export default CreatePage;
