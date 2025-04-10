import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { debounce } from 'lodash';

import { useAccount } from '@/hooks/useAccount';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword, verifyPubKey } from '@/lib/key';
import { theme } from '@/lib/theme';
import { formatPubKey } from '@/lib/util';
import { addMultiSig } from '@/utils/sqlite';

interface FormData {
	pubKeyCount: string;
	requiredSignatures: string;
	pubKeys: string[];
	password: string;
}

interface FormErrors {
	pubKeyCount?: string;
	requiredSignatures?: string;
	pubKeys?: { [key: number]: string };
	password?: string;
}

export default function CreateMultiSigWalletPage() {
	const { getCurrentAccountAddress, getSalt, getPassKey, getCurrentAccountTbcPubKey } =
		useAccount();
	const { createMultiSigWallet } = useTbcTransaction();
	const [formData, setFormData] = useState<FormData>({
		pubKeyCount: '3',
		requiredSignatures: '2',
		pubKeys: ['', '', ''],
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [isLoading, setIsLoading] = useState(false);
	const [isFormValid, setIsFormValid] = useState(false);
	const [displayPubKeys, setDisplayPubKeys] = useState<string[]>(['', '', '']);

	const passKey = getPassKey();
	const salt = getSalt();

	const debouncedPasswordValidation = useCallback(
		debounce(async (password: string) => {
			if (!password) {
				setFormErrors((prev) => ({ ...prev, password: 'Password is required' }));
				return;
			}

			if (!passKey || !salt) {
				setFormErrors((prev) => ({
					...prev,
					password: 'Account error, please try again',
				}));
				return;
			}

			try {
				const isValid = verifyPassword(password, passKey, salt);
				setFormErrors((prev) => ({
					...prev,
					password: isValid ? undefined : 'Incorrect password',
				}));
			} catch (error) {
				console.error('Password validation error:', error);
				setFormErrors((prev) => ({
					...prev,
					password: 'Incorrect password',
				}));
			}
		}, 1500),
		[getPassKey, getSalt],
	);

	useEffect(() => {
		const currentPubKey = getCurrentAccountTbcPubKey();
		if (currentPubKey) {
			const newPubKeys = [...formData.pubKeys];
			newPubKeys[0] = currentPubKey;
			setFormData((prev) => ({
				...prev,
				pubKeys: newPubKeys,
			}));

			const newDisplayPubKeys = [...displayPubKeys];
			newDisplayPubKeys[0] = formatPubKey(currentPubKey);
			setDisplayPubKeys(newDisplayPubKeys);
		}
	}, []);

	useEffect(() => {
		const pubKeyCount = parseInt(formData.pubKeyCount, 10);
		const reqSig = parseInt(formData.requiredSignatures, 10);

		const isBasicValid =
			pubKeyCount >= 3 &&
			pubKeyCount <= 10 &&
			reqSig >= 1 &&
			reqSig <= pubKeyCount &&
			formData.password.length > 0;

		const allPubKeysProvided = formData.pubKeys.every((key) => key.trim().length > 0);

		setIsFormValid(isBasicValid && allPubKeysProvided);
	}, [formData]);

	const handleInputChange = (field: keyof FormData, value: string) => {
		if (field === 'pubKeyCount') {
			const count = parseInt(value, 10);
			if (!isNaN(count) && count >= 3 && count <= 10) {
				const newPubKeys = [...formData.pubKeys];
				const newDisplayPubKeys = [...displayPubKeys];
				const currentPubKey = getCurrentAccountTbcPubKey() || '';

				if (newPubKeys.length === 0) {
					newPubKeys.push(currentPubKey);
					newDisplayPubKeys.push(formatPubKey(currentPubKey));
				} else {
					newPubKeys[0] = currentPubKey;
					newDisplayPubKeys[0] = formatPubKey(currentPubKey);
				}

				if (count > newPubKeys.length) {
					for (let i = newPubKeys.length; i < count; i++) {
						newPubKeys.push('');
						newDisplayPubKeys.push('');
					}
				} else if (count < newPubKeys.length) {
					newPubKeys.splice(count);
					newDisplayPubKeys.splice(count);
				}

				const reqSig = parseInt(formData.requiredSignatures, 10);
				if (reqSig > count) {
					setFormData((prev) => ({
						...prev,
						pubKeyCount: value,
						pubKeys: newPubKeys,
						requiredSignatures: count.toString(),
					}));
				} else {
					setFormData((prev) => ({
						...prev,
						pubKeyCount: value,
						pubKeys: newPubKeys,
					}));
				}

				setDisplayPubKeys(newDisplayPubKeys);
			} else {
				setFormData((prev) => ({ ...prev, pubKeyCount: value }));
			}
		} else if (field === 'requiredSignatures') {
			setFormData((prev) => ({ ...prev, requiredSignatures: value }));
		} else if (field === 'password') {
			const cleanValue = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
			setFormData((prev) => ({ ...prev, password: cleanValue }));
			debouncedPasswordValidation(cleanValue);
		}
	};

	const handlePubKeyChange = (index: number, value: string) => {
		if (index === 0) return;

		const newPubKeys = [...formData.pubKeys];
		newPubKeys[index] = value;
		setFormData((prev) => ({ ...prev, pubKeys: newPubKeys }));

		const newDisplayPubKeys = [...displayPubKeys];
		newDisplayPubKeys[index] = value ? formatPubKey(value) : '';
		setDisplayPubKeys(newDisplayPubKeys);

		if (formErrors.pubKeys?.[index]) {
			setFormErrors((prev) => {
				const newPubKeys = { ...prev.pubKeys };
				delete newPubKeys[index];
				return {
					...prev,
					pubKeys: newPubKeys,
				};
			});
		}
	};

	const handleClearField = (field: keyof FormData) => {
		if (field === 'password') {
			setFormData((prev) => ({ ...prev, password: '' }));
		}
	};

	const handleClearPubKey = (index: number) => {
		if (index === 0) return;

		const newPubKeys = [...formData.pubKeys];
		newPubKeys[index] = '';
		setFormData((prev) => ({ ...prev, pubKeys: newPubKeys }));

		const newDisplayPubKeys = [...displayPubKeys];
		newDisplayPubKeys[index] = '';
		setDisplayPubKeys(newDisplayPubKeys);
	};

	const validateForm = (): boolean => {
		const errors: FormErrors = {};
		let isValid = true;

		const pubKeyCount = parseInt(formData.pubKeyCount, 10);
		if (isNaN(pubKeyCount) || pubKeyCount < 3 || pubKeyCount > 10) {
			errors.pubKeyCount = 'Public key count must be between 3 and 10';
			isValid = false;
		}

		const reqSig = parseInt(formData.requiredSignatures, 10);
		if (isNaN(reqSig) || reqSig < 1 || reqSig > pubKeyCount) {
			errors.requiredSignatures = `Required signatures must be between 1 and ${pubKeyCount}`;
			isValid = false;
		}

		const pubKeyErrors: { [key: number]: string } = {};
		formData.pubKeys.forEach((pubKey, index) => {
			if (!pubKey.trim()) {
				pubKeyErrors[index] = `Public key ${index + 1} is required`;
				isValid = false;
			} else if (!verifyPubKey(pubKey)) {
				pubKeyErrors[index] = `Public key ${index + 1} is invalid`;
				isValid = false;
				if (index !== 0) {
					const newPubKeys = [...formData.pubKeys];
					newPubKeys[index] = '';
					setFormData((prev) => ({
						...prev,
						pubKeys: newPubKeys,
					}));

					const newDisplayPubKeys = [...displayPubKeys];
					newDisplayPubKeys[index] = '';
					setDisplayPubKeys(newDisplayPubKeys);
				}
			}
		});

		if (Object.keys(pubKeyErrors).length > 0) {
			errors.pubKeys = pubKeyErrors;
		}

		if (!formData.password) {
			errors.password = 'Password is required';
			isValid = false;
		}

		setFormErrors(errors);
		return isValid;
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Please fix the errors in the form',
			});
			return;
		}

		setIsLoading(true);

		try {
			const currentAddress = getCurrentAccountAddress();
			if (!currentAddress) {
				throw new Error('No account address found');
			}

			if (formErrors.password) {
				setIsLoading(false);
				return;
			}

			const multiSigAddress = await createMultiSigWallet(
				formData.pubKeys,
				parseInt(formData.requiredSignatures, 10),
				currentAddress,
				formData.password,
			);

			await addMultiSig(
				{
					multiSig_address: multiSigAddress,
					pubKeys: formData.pubKeys,
					isDeleted: false,
				},
				currentAddress,
			);

			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'MultiSig wallet created successfully',
			});

			router.back();
		} catch (error: any) {
			console.error('Failed to create MultiSig wallet:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error.message || 'Failed to create MultiSig wallet',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.description}>
					Creating a MultiSig wallet will deposit 0.005 TBC to the MultiSig address. The MultiSig
					address and the list of public keys will be stored on the blockchain.
				</Text>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Number of Public Keys (3-10)</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.pubKeyCount && styles.inputError]}
							value={formData.pubKeyCount}
							onChangeText={(text) => handleInputChange('pubKeyCount', text)}
							placeholder="Enter number of public keys"
							keyboardType="numeric"
							editable={!isLoading}
						/>
					</View>
					{formErrors.pubKeyCount && <Text style={styles.errorText}>{formErrors.pubKeyCount}</Text>}
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>
						Required Signatures(1-6 && less than number of public keys)
					</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.requiredSignatures && styles.inputError]}
							value={formData.requiredSignatures}
							onChangeText={(text) => handleInputChange('requiredSignatures', text)}
							placeholder="Enter required signatures"
							keyboardType="numeric"
							editable={!isLoading}
						/>
					</View>
					{formErrors.requiredSignatures && (
						<Text style={styles.errorText}>{formErrors.requiredSignatures}</Text>
					)}
				</View>

				{formData.pubKeys.map((pubKey, index) => (
					<View key={index} style={styles.inputGroup}>
						<Text style={styles.label}>
							Public Key {index + 1} {index === 0 ? '(Your Public Key)' : ''}
						</Text>
						<View style={styles.inputWrapper}>
							<TextInput
								style={[
									styles.input,
									styles.pubKeyInput,
									index === 0 && styles.disabledInput,
									formErrors.pubKeys && formErrors.pubKeys[index] && styles.inputError,
								]}
								value={displayPubKeys[index]}
								onChangeText={(text) => handlePubKeyChange(index, text)}
								placeholder={`Enter public key ${index + 1}`}
								autoCapitalize="none"
								autoCorrect={false}
								editable={!isLoading && index !== 0}
							/>
							{displayPubKeys[index].length > 0 && index !== 0 && (
								<TouchableOpacity
									style={styles.clearButton}
									onPress={() => handleClearPubKey(index)}
								>
									<MaterialIcons name="close" size={20} color="#666" />
								</TouchableOpacity>
							)}
						</View>
						{formErrors.pubKeys && formErrors.pubKeys[index] && (
							<Text style={styles.errorText}>{formErrors.pubKeys[index]}</Text>
						)}
					</View>
				))}

				<View style={styles.inputGroup}>
					<Text style={styles.label}>Password</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.password && styles.inputError]}
							value={formData.password}
							onChangeText={(text) => handleInputChange('password', text)}
							placeholder="Enter your password"
							secureTextEntry={true}
							autoCapitalize="none"
							autoCorrect={false}
							editable={!isLoading}
						/>
						{formData.password.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearField('password')}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
				</View>

				<TouchableOpacity
					style={[styles.createButton, (!isFormValid || isLoading) && styles.createButtonDisabled]}
					onPress={handleSubmit}
					disabled={!isFormValid || isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.createButtonText}>Create MultiSig Wallet</Text>
					)}
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		padding: wp(4),
		paddingTop: hp(2),
	},
	description: {
		fontSize: hp(1.6),
		color: '#666',
		marginBottom: hp(2),
		textAlign: 'center',
		lineHeight: hp(2.2),
	},
	inputGroup: {
		marginBottom: hp(2),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
	},
	inputWrapper: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		paddingVertical: hp(0.8),
		fontSize: hp(1.6),
		backgroundColor: '#f8f8f8',
		height: hp(4.5),
	},
	pubKeyInput: {
		fontSize: hp(1.4),
		height: hp(5),
		paddingRight: wp(10),
	},
	disabledInput: {
		backgroundColor: '#f0f0f0',
		color: '#666',
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: wp(1),
	},
	inputError: {
		borderColor: '#ff4444',
	},
	errorText: {
		color: '#ff4444',
		fontSize: hp(1.4),
		marginTop: hp(0.5),
		marginLeft: wp(1),
	},
	createButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(3),
	},
	createButtonDisabled: {
		backgroundColor: '#999',
	},
	createButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
});
