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
import { useNftTransaction } from '@/hooks/useNftTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatFee } from '@/lib/util';
import { updateNFTTransferTimes, updateNFTUserAddress, removeNFT } from '@/utils/sqlite';

interface FormData {
	addressTo: string;
	password: string;
}

interface FormErrors {
	addressTo?: string;
	password?: string;
}

const NFTTransferPage = () => {
	const { getCurrentAccountAddress, getSalt, getPassKey, getAllAccountAddresses } = useAccount();
	const { finish_transaction } = useTbcTransaction();
	const { transferNFT } = useNftTransaction();
	const { id, transferTimes } = useLocalSearchParams<{
		id: string;
		transferTimes: string;
	}>();

	const [formData, setFormData] = useState<FormData>({
		addressTo: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);
	const [transferTimesCount, setTransferTimesCount] = useState<number>(0);

	useEffect(() => {
		if (transferTimes) {
			setTransferTimesCount(parseInt(transferTimes));
		}
	}, [transferTimes]);

	const validateAddress = (address: string) => {
		if (!address) return 'Address is required';

		if (!/^[a-zA-Z0-9]+$/.test(address)) {
			return 'Invalid address';
		}

		if (!(address.startsWith('1') && (address.length === 33 || address.length === 34))) {
			return 'Invalid address';
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

		const updatedFormData = { ...formData, [field]: value };
		setFormData(updatedFormData);

		let error = '';
		if (field === 'addressTo') {
			error = validateAddress(value);
		} else if (field === 'password') {
			debouncedPasswordValidation(value);
			return;
		}
		setFormErrors((prev) => ({ ...prev, [field]: error }));
	};

	const handleClearField = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));

		if (field === 'password' || field === 'addressTo') {
			setEstimatedFee(null);
		}
	};

	const handleSelectAddress = (address: string) => {
		handleInputChange('addressTo', address);
	};

	const calculateEstimatedFee = useCallback(async () => {
		if (!formData.addressTo || !formData.password) return;

		const addressError = validateAddress(formData.addressTo);
		if (addressError ) return;

    const passKey = getPassKey();
		const salt = getSalt();
		if (!passKey || !salt || !verifyPassword(formData.password, passKey, salt)) {
			return; 
		}

		setIsCalculatingFee(true);
		try {
			const result = await transferNFT(
				id,
				getCurrentAccountAddress(),
				formData.addressTo,
				transferTimesCount,
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
	}, [formData, id, transferTimesCount, formErrors.password]);

	useEffect(() => {
		calculateEstimatedFee();
	}, [formData]);

	const handleSubmit = async () => {
		const addressError = validateAddress(formData.addressTo);
		const passwordError = formErrors.password;

		const newErrors = {
			addressTo: addressError,
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
			const result = await transferNFT(
				id,
				getCurrentAccountAddress(),
				formData.addressTo,
				transferTimesCount,
				formData.password,
			);
			const currentAddress = getCurrentAccountAddress();

			await finish_transaction(result.txHex, result.utxos!);

			if (formData.addressTo === currentAddress) {
				await updateNFTTransferTimes(id, transferTimesCount + 1);
			} else {
				const allAddresses = getAllAccountAddresses();

				if (allAddresses.includes(formData.addressTo)) {
					await updateNFTUserAddress(id, formData.addressTo);
				} else {
					await removeNFT(id);
				}
			}

			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'NFT transferred successfully',
			});

			router.back();
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error instanceof Error ? error.message : 'Failed to transfer NFT',
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
						placeholder="Enter recipient address (not support MultiSig)"
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
				<View style={styles.feeValueContainer}>
					{isCalculatingFee ? (
						<ActivityIndicator size="small" color="#666" />
					) : (
						estimatedFee !== null && (
							<Text style={styles.feeAmount}>{formatFee(estimatedFee)} TBC</Text>
						)
					)}
				</View>
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
	divider: {
		height: 1,
		backgroundColor: '#eee',
		marginVertical: hp(1.5),
	},
	feeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: hp(2),
		paddingHorizontal: wp(1),
	},
	feeLabel: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	feeValueContainer: {
		flex: 1,
		alignItems: 'flex-end',
	},
	feeAmount: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		textAlign: 'right',
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
	calculateButton: {
		backgroundColor: '#000',
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	calculateButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
});

export default NFTTransferPage;
