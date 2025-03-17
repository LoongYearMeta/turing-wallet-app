import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { AddressSelector } from '@/components/address-selector';
import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatFee } from '@/lib/util';
import { transferFT } from '@/utils/sqlite';

interface FormData {
	addressTo: string;
	amount: string;
	password: string;
}

interface FormErrors {
	addressTo?: string;
	amount?: string;
	password?: string;
}

const TokenTransferPage = () => {
	const { getCurrentAccountAddress, getSalt, getPassKey } = useAccount();
	const { finish_transaction } = useTbcTransaction();
	const { sendFT } = useFtTransaction();
	const { contractId, amount } = useLocalSearchParams<{
		contractId: string;
		amount: string;
	}>();
	const [formData, setFormData] = useState<FormData>({
		addressTo: '',
		amount: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);
	const [availableAmount, setAvailableAmount] = useState<number>(0);

	useEffect(() => {
		if (amount) {
			setAvailableAmount(parseFloat(amount));
		}
	}, [amount]);

	const validateAddress = (address: string) => {
		if (!address) return 'Address is required';

		if (!/^[a-zA-Z0-9]+$/.test(address)) {
			return 'Invalid address';
		}

		if (address.startsWith('1')) {
			if (address.length !== 33 && address.length !== 34) {
				return 'Invalid address';
			}
		} else {
			if (address.length !== 33) {
				return 'Invalid address';
			}
		}
		return '';
	};

	const validateAmount = (amountStr: string) => {
		if (!amountStr) return 'Amount is required';
		const num = Number(amountStr);
		if (isNaN(num) || num <= 0) {
			return 'Please enter a valid positive number';
		}

		if (num > availableAmount) {
			return 'Amount exceeds your balance';
		}

		return '';
	};

	const debouncedPasswordValidation = useCallback(
		debounce(async (password: string) => {
			if (!password) {
				setFormErrors((prev) => ({ ...prev, password: 'Password is required' }));
				return;
			}

			const passKey = getPassKey();
			const salt = getSalt();

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
					password: isValid ? '' : 'Incorrect password',
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

	const handleInputChange = async (field: keyof FormData, value: string) => {
		if (field === 'password') {
			value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		}

		setFormData((prev) => ({ ...prev, [field]: value }));

		if (field === 'addressTo') {
			const error = validateAddress(value);
			setFormErrors((prev) => ({ ...prev, addressTo: error }));
		} else if (field === 'amount') {
			const error = validateAmount(value);
			setFormErrors((prev) => ({ ...prev, amount: error }));
		} else if (field === 'password') {
			debouncedPasswordValidation(value);
		}
	};

	const handleClearField = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));
	};

	const handleSelectAddress = (address: string) => {
		handleInputChange('addressTo', address);
	};

	const calculateEstimatedFee = useCallback(async () => {
		if (!formData.addressTo || !formData.amount || !formData.password) return;

		const addressError = validateAddress(formData.addressTo);
		const amountError = validateAmount(formData.amount);
		const passwordError = formErrors.password;

		if (addressError || amountError || passwordError) return;

		setIsCalculatingFee(true);
		try {
			const result = await sendFT(
				contractId,
				getCurrentAccountAddress(),
				formData.addressTo,
				Number(formData.amount),
				formData.password,
			);
			setEstimatedFee(result.fee);
		} catch (error) {
			if (
				error instanceof Error &&
				!error.message.includes('Invalid') &&
				!error.message.includes('Password') &&
				!error.message.includes('required')
			) {
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: error.message,
				});
			}
			setEstimatedFee(null);
		} finally {
			setIsCalculatingFee(false);
		}
	}, [formData, contractId, formErrors.password]);

	useEffect(() => {
		calculateEstimatedFee();
	}, [formData, calculateEstimatedFee]);

	const handleSubmit = async () => {
		const addressError = validateAddress(formData.addressTo);
		const amountError = validateAmount(formData.amount);
		const passwordError = formErrors.password;

		const newErrors = {
			addressTo: addressError,
			amount: amountError,
			password: passwordError,
		};

		setFormErrors(newErrors);

		if (Object.values(newErrors).some((error) => error)) {
			Toast.show({
				type: 'error',
				text1: 'Validation Error',
				text2: 'Please check your input',
			});
			return;
		}

		try {
			const result = await sendFT(
				contractId,
				getCurrentAccountAddress(),
				formData.addressTo,
				Number(formData.amount),
				formData.password,
			);
			const currentAddress = getCurrentAccountAddress();
			if (formData.addressTo !== currentAddress) {
				await transferFT(contractId, Number(formData.amount), currentAddress);
			}
			await finish_transaction(result.txHex, result.utxos!);
			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'Token transferred successfully',
			});

			router.back();
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error instanceof Error ? error.message : 'Failed to transfer token',
			});
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.inputGroup}>
				<View style={styles.labelRow}>
					<Text style={styles.label}>Recipient Address</Text>
					<TouchableOpacity onPress={() => setShowAddressSelector(true)}>
						<Ionicons name="book-outline" size={20} color="#333" />
					</TouchableOpacity>
				</View>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.addressTo && styles.inputError]}
						value={formData.addressTo}
						onChangeText={(text) => handleInputChange('addressTo', text)}
						placeholder="Enter recipient address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{formData.addressTo.length > 0 && (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => handleClearField('addressTo')}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				{formErrors.addressTo && <Text style={styles.errorText}>{formErrors.addressTo}</Text>}
			</View>

			<View style={styles.inputGroup}>
				<Text style={styles.label}>Amount</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.amount && styles.inputError]}
						value={formData.amount}
						onChangeText={(text) => handleInputChange('amount', text)}
						placeholder="Enter amount"
						keyboardType="decimal-pad"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{formData.amount.length > 0 && (
						<TouchableOpacity style={styles.clearButton} onPress={() => handleClearField('amount')}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				{formErrors.amount ? (
					<Text style={styles.errorText}>{formErrors.amount}</Text>
				) : (
					<Text style={styles.balanceText}>Available: {availableAmount}</Text>
				)}
			</View>

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

			<View style={styles.divider} />
			<View style={styles.feeContainer}>
				<Text style={styles.feeLabel}>Estimated Fee: </Text>
				{isCalculatingFee ? (
					<ActivityIndicator size="small" color="#666" />
				) : (
					estimatedFee !== null && (
						<Text style={styles.feeAmount}>{formatFee(estimatedFee)} TBC</Text>
					)
				)}
			</View>

			<TouchableOpacity
				style={[
					styles.transferButton,
					(!estimatedFee || Object.values(formErrors).some(Boolean) || isCalculatingFee) &&
						styles.transferButtonDisabled,
				]}
				onPress={handleSubmit}
				disabled={!estimatedFee || Object.values(formErrors).some(Boolean) || isCalculatingFee}
			>
				<Text style={styles.transferButtonText}>
					{isCalculatingFee ? 'Calculating Fee...' : 'Transfer'}
				</Text>
			</TouchableOpacity>

			<AddressSelector
				visible={showAddressSelector}
				onClose={() => setShowAddressSelector(false)}
				onSelect={handleSelectAddress}
				userAddress={getCurrentAccountAddress()}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: wp(4),
		paddingTop: hp(3),
	},
	inputGroup: {
		marginBottom: hp(2),
	},
	labelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: hp(1),
		paddingLeft: wp(1),
		paddingRight: wp(1),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
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
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: wp(1),
	},
	balanceText: {
		fontSize: hp(1.4),
		color: '#666',
		marginTop: hp(0.5),
		marginLeft: wp(1),
	},
	submitButton: {
		backgroundColor: '#000',
		borderRadius: 8,
		paddingVertical: hp(1.5),
		alignItems: 'center',
		marginTop: hp(2),
	},
	submitButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	divider: {
		height: 1,
		backgroundColor: '#eee',
		marginVertical: hp(1.5),
	},
	feeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: hp(2),
		paddingHorizontal: wp(1),
	},
	feeLabel: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	feeAmount: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
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
	transferButton: {
		backgroundColor: '#000',
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	transferButtonDisabled: {
		backgroundColor: '#666',
	},
	transferButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
});

export default TokenTransferPage;
