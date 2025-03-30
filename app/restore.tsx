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
	Modal,
	Pressable,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';

import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { generateKeysEncrypted_byMnemonic, verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { Account, AccountType } from '@/types';

enum Tag {
	Turing = 'turing',
	Tp = 'tp',
	Okx = 'okx',
	Nabox = 'nabox',
}

const RestorePage = () => {
	const { getPassKey, getSalt } = useAccount();
	const passKey = getPassKey();
	const salt = getSalt();
	const hasExistingAccount = passKey && salt;

	const [mnemonic, setMnemonic] = useState('');
	const [selectedTag, setSelectedTag] = useState<Tag>(Tag.Turing);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPickerVisible, setPickerVisible] = useState(false);
	const { addAccount, setCurrentAccount, setPassKeyAndSalt, getAccountsCount } = useAccount();
	const router = useRouter();

	const walletTypes = [
		{ label: 'Turing', value: Tag.Turing },
		{ label: 'TokenPocket', value: Tag.Tp },
		{ label: 'OKX', value: Tag.Okx },
		{ label: 'Nabox', value: Tag.Nabox },
	];

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
			if (!mnemonic || !password || !confirmPassword) {
				showToast('error', 'Please fill in all fields');
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
				const result = generateKeysEncrypted_byMnemonic(password, mnemonic, selectedTag, salt);
				if (!result) {
					throw new Error('Failed to generate keys');
				}

				const { encryptedKeys, tbcAddress, pubKey, taprootAddress, taprootLegacyAddress } = result;

				const accountsCount = getAccountsCount();
				const newAccount: Account = {
					accountName: `Wallet ${accountsCount + 1}`,
					addresses: {
						tbcAddress,
						taprootAddress,
						taprootLegacyAddress,
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
				const result = generateKeysEncrypted_byMnemonic(password, mnemonic, selectedTag);
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
				} = result;

				await setPassKeyAndSalt(passKey, salt);

				const accountsCount = getAccountsCount();
				const newAccount: Account = {
					accountName: `Wallet ${accountsCount + 1}`,
					addresses: {
						tbcAddress,
						taprootAddress,
						taprootLegacyAddress,
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
			}

			router.replace('/');
		} catch (error: any) {
			showToast('error', error.message);
		} finally {
			setLoading(false);
			setIsSubmitting(false);
		}
	};

	const isButtonDisabled = loading || isSubmitting;
	const buttonStyle = [
		styles.button,
		isButtonDisabled && styles.disabledButton,
		isSubmitting && styles.buttonSubmitting,
		loading && styles.buttonLoading,
	];

	return (
		<ScreenWrapper bg={'white'}>
			<StatusBar style="auto" />
			<View style={styles.container}>
				<ScrollView style={styles.content}>
					<Text style={styles.welcomeText}>Restore Wallet</Text>
					<View style={styles.form}>
						{!hasExistingAccount && (
							<Text style={styles.description}>
								Please enter your mnemonic phrase and set a password to restore your wallet.
							</Text>
						)}

						{!hasExistingAccount && (
							<>
								<View style={styles.inputGroup}>
									<Text style={styles.label}>Mnemonic Phrase</Text>
									<Input
										icon={<MaterialIcons name="vpn-key" size={26} color={theme.colors.text} />}
										placeholder="Enter your mnemonic phrase"
										value={mnemonic}
										onChangeText={setMnemonic}
										editable={!isButtonDisabled}
										multiline
									/>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.label}>Wallet Type</Text>
									<Pressable
										style={styles.pickerButton}
										onPress={() => setPickerVisible(true)}
										disabled={isButtonDisabled}
									>
										<Text style={styles.pickerButtonText}>
											{walletTypes.find((type) => type.value === selectedTag)?.label}
										</Text>
										<MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text} />
									</Pressable>
								</View>

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
							</>
						)}

						<View style={styles.inputGroup}>
							<Text style={styles.label}>
								{hasExistingAccount ? 'Password' : 'Confirm Password'}
							</Text>
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
				</ScrollView>

				<View style={styles.bottomContainer}>
					<TouchableOpacity
						style={buttonStyle}
						onPress={onSubmit}
						disabled={isButtonDisabled}
						activeOpacity={0.5}
						pressRetentionOffset={{ top: 10, left: 10, bottom: 10, right: 10 }}
					>
						{loading ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator color="white" size="small" />
								<Text style={styles.buttonText}>Restoring wallet...</Text>
							</View>
						) : (
							<Text style={styles.buttonText}>Restore wallet</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>

			<Modal
				visible={isPickerVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setPickerVisible(false)}
			>
				<Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
					<View style={styles.modalContent}>
						{walletTypes.map((type) => (
							<Pressable
								key={type.value}
								style={styles.optionButton}
								onPress={() => {
									setSelectedTag(type.value);
									setPickerVisible(false);
								}}
							>
								<Text
									style={[styles.optionText, selectedTag === type.value && styles.selectedOption]}
								>
									{type.label}
								</Text>
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>
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
		flex: 1,
	},
	welcomeText: {
		fontSize: hp(2.8),
		fontWeight: '700',
		color: theme.colors.text,
		marginTop: hp(4),
		marginBottom: hp(2),
	},
	form: {
		gap: 25,
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
	pickerButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		padding: 18,
		paddingHorizontal: 20,
	},
	pickerButtonText: {
		fontSize: hp(1.6),
		color: theme.colors.text,
	},
	bottomContainer: {
		gap: hp(3),
		marginBottom: hp(4),
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
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: wp(2),
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: 'white',
		borderTopLeftRadius: theme.radius.xl,
		borderTopRightRadius: theme.radius.xl,
		padding: 20,
	},
	optionButton: {
		paddingVertical: 15,
		alignItems: 'center',
	},
	optionText: {
		fontSize: hp(1.8),
		color: theme.colors.text,
	},
	selectedOption: {
		color: theme.colors.primary,
		fontWeight: '600',
	},
});

export default RestorePage;
