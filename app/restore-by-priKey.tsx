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
import { MaterialIcons } from '@expo/vector-icons';

import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { generateKeysEncrypted_wif, verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { Account, AccountType } from '@/types';
import { initializeWalletData } from '@/lib/init';
import { formatLongString } from '@/lib/util';

const RestoreByPriKeyPage = () => {
	const { getPassKey, getSalt } = useAccount();
	const passKey = getPassKey();
	const salt = getSalt();
	const hasExistingAccount = passKey && salt;

	const [privateKey, setPrivateKey] = useState('');
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

	const validateAndSubmitForm = async () => {
		if (hasExistingAccount) {
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
			if (!privateKey.trim()) {
				showToast('error', 'Please enter your private key');
				setIsSubmitting(false);
				return;
			}

			if (!password || !confirmPassword) {
				showToast('error', 'Please fill in all password fields');
				setIsSubmitting(false);
				return;
			}

			if (!validatePassword(password)) {
				showToast('error', 'Password must be 6-15 characters and contain only letters and numbers');
				setIsSubmitting(false);
				return;
			}

			if (password !== confirmPassword) {
				showToast('error', 'Passwords do not match');
				setIsSubmitting(false);
				return;
			}
		}

		try {
			setLoading(true);

			if (hasExistingAccount) {
				const result = generateKeysEncrypted_wif(password, privateKey.trim(), salt);
				if (!result) {
					throw new Error('Invalid private key');
				}

				const { encryptedKeys, tbcAddress, pubKey, taprootAddress, taprootLegacyAddress, legacyAddress } = result;

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

				await initializeWalletData(tbcAddress);
				await initializeWalletData(taprootLegacyAddress);
				await addAccount(newAccount);
				await setCurrentAccount(tbcAddress);
			} else {
				const result = generateKeysEncrypted_wif(password, privateKey.trim());
				if (!result) {
					throw new Error('Invalid private key');
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

				await setPassKeyAndSalt(passKey, salt);

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

				await initializeWalletData(tbcAddress);
				await initializeWalletData(taprootLegacyAddress);
				await addAccount(newAccount);
				await setCurrentAccount(tbcAddress);
			}

			router.replace('/(tabs)/home');
			showToast('success', 'Wallet restored successfully!');
		} catch (error: any) {
			showToast('error', error.message);
		} finally {
			setLoading(false);
			setIsSubmitting(false);
		}
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

	const isButtonDisabled = loading || isSubmitting;
	const buttonStyle = [
		styles.button,
		isButtonDisabled && styles.disabledButton,
		isSubmitting && styles.buttonSubmitting,
		loading && styles.buttonLoading,
	];

	const handlePrivateKeyChange = (text: string) => {
		setPrivateKey(text);
	};

	return (
		<ScreenWrapper bg={'white'}>
			<StatusBar style="auto" />
			{loading ? (
				<View style={styles.loadingContent}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>
						Restoring your data from blockchain, please wait...
					</Text>
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
							<Text style={styles.welcomeText}>Restore Wallet</Text>
						</View>
						<View style={styles.form}>
							<Text style={styles.description}>
								Please enter your private key{hasExistingAccount ? '' : ' and set a password'} to
								restore your wallet.
							</Text>

							<View style={styles.inputGroup}>
								<View style={styles.labelContainer}>
									<Text style={styles.label}>Private Key</Text>
								</View>
								<Input
									value={formatLongString(privateKey, 18)}
									onChangeText={handlePrivateKeyChange}
									editable={!isButtonDisabled}
									placeholder="Enter your private key"
									multiline={false}
									autoCapitalize="none"
									autoCorrect={false}
									contextMenuHidden={false}
								/>
							</View>

							{!hasExistingAccount && (
								<View style={styles.inputGroup}>
									<Text style={styles.label}>Password</Text>
									<Input
										icon={<MaterialIcons name="lock" size={26} color={theme.colors.text} />}
										secureTextEntry
										placeholder="Set your password"
										value={password}
										onChangeText={setPassword}
										editable={!isButtonDisabled}
									/>
								</View>
							)}

							<View style={styles.inputGroup}>
								<Text style={styles.label}>Confirm Password</Text>
								<Input
									icon={<MaterialIcons name="lock" size={26} color={theme.colors.text} />}
									secureTextEntry
									placeholder={hasExistingAccount ? 'Enter your password' : 'Confirm your password'}
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
							<Text style={styles.buttonText}>Restore wallet</Text>
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
	description: {
		fontSize: hp(1.5),
		color: theme.colors.text,
		marginBottom: hp(1),
	},
	inputGroup: {
		gap: hp(1),
		marginBottom: hp(1),
	},
	label: {
		fontSize: hp(1.6),
		fontWeight: '600',
		color: theme.colors.text,
		marginLeft: wp(2),
	},
	labelContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginLeft: wp(2),
		marginRight: wp(2),
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
		marginTop: hp(10),
	},
	loadingText: {
		fontSize: hp(1.8),
		color: theme.colors.text,
		textAlign: 'center',
		marginHorizontal: wp(10),
	},
});

export default RestoreByPriKeyPage;
