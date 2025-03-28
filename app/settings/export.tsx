import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { debounce } from 'lodash';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { retrieveKeys, verifyPassword } from '@/lib/key';

interface FormErrors {
	password?: string;
}

export default function ExportPage() {
	const { getSalt, getPassKey, getEncryptedKeys } = useAccount();
	const [password, setPassword] = useState('');
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [isPasswordValid, setIsPasswordValid] = useState(false);
	const [keys, setKeys] = useState<{ mnemonic?: string; walletWif: string }>({ walletWif: '' });

	const debouncedPasswordValidation = useCallback(
		debounce(async (password: string) => {
			if (!password) {
				setFormErrors((prev) => ({ ...prev, password: 'Password is required' }));
				setIsPasswordValid(false);
				return;
			}

			const passKey = getPassKey();
			const salt = getSalt();

			if (!passKey || !salt) {
				setFormErrors((prev) => ({
					...prev,
					password: 'Account error, please try again',
				}));
				setIsPasswordValid(false);
				return;
			}

			try {
				const isValid = verifyPassword(password, passKey, salt);
				setFormErrors((prev) => ({
					...prev,
					password: isValid ? '' : 'Incorrect password',
				}));
				setIsPasswordValid(isValid);

				if (isValid) {
					const encryptedKeys = getEncryptedKeys();
					const decryptedKeys = retrieveKeys(password, encryptedKeys!);
					setKeys(decryptedKeys);
				}
			} catch (error) {
				console.error('Password validation error:', error);
				setFormErrors((prev) => ({
					...prev,
					password: 'Incorrect password',
				}));
				setIsPasswordValid(false);
			}
		}, 1500),
		[getPassKey, getSalt, getEncryptedKeys],
	);

	const handlePasswordChange = (value: string) => {
		const cleanValue = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		setPassword(cleanValue);
		debouncedPasswordValidation(cleanValue);
	};

	const handleClearPassword = () => {
		setPassword('');
		setFormErrors({});
		setIsPasswordValid(false);
		setKeys({ walletWif: '' });
	};

	const handleCopy = async (text: string, label: string) => {
		await Clipboard.setStringAsync(text);
		Toast.show({
			type: 'success',
			text1: `${label} copied to clipboard`,
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.inputGroup}>
				<Text style={styles.label}>Password</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.password && styles.inputError]}
						value={password}
						onChangeText={handlePasswordChange}
						placeholder="Enter your password"
						secureTextEntry={true}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{password.length > 0 && (
						<TouchableOpacity style={styles.clearButton} onPress={handleClearPassword}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
			</View>

			{isPasswordValid && (
				<View style={styles.keysContainer}>
					{keys.mnemonic && (
						<View style={styles.keyGroup}>
							<Text style={styles.keyLabel}>Mnemonic</Text>
							<View style={styles.keyWrapper}>
								<Text style={styles.keyValue}>{keys.mnemonic}</Text>
								<TouchableOpacity
									style={styles.copyButton}
									onPress={() => handleCopy(keys.mnemonic!, 'Mnemonic')}
								>
									<MaterialIcons name="content-copy" size={20} color="#666" />
								</TouchableOpacity>
							</View>
						</View>
					)}

					<View style={styles.keyGroup}>
						<Text style={styles.keyLabel}>Private Key</Text>
						<View style={styles.keyWrapper}>
							<Text style={styles.keyValue}>{keys.walletWif}</Text>
							<TouchableOpacity
								style={styles.copyButton}
								onPress={() => handleCopy(keys.walletWif, 'Private Key')}
							>
								<MaterialIcons name="content-copy" size={20} color="#666" />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: wp(4),
	},
	inputGroup: {
		marginBottom: hp(2),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
		marginLeft: wp(1),
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
		paddingVertical: hp(1.5),
		fontSize: hp(1.6),
		backgroundColor: '#f8f8f8',
		paddingRight: wp(10),
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		padding: wp(2),
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
	keysContainer: {
		marginTop: hp(2),
	},
	keyGroup: {
		marginBottom: hp(3),
	},
	keyLabel: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
		marginLeft: wp(1),
	},
	keyWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f8f8',
		borderRadius: 8,
		padding: wp(3),
	},
	keyValue: {
		flex: 1,
		fontSize: hp(1.6),
		color: '#333',
		paddingRight: wp(2),
	},
	copyButton: {
		padding: wp(2),
	},
});
