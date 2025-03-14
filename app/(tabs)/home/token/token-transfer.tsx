import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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

import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { getFT } from '@/utils/sqlite';

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
	const { getCurrentAccountAddress, getSalt, getEncryptedKeys, getPassKey } = useAccount();
	const { finish_transaction } = useTbcTransaction();
	const { sendFT } = useFtTransaction();
	const { contractId } = useLocalSearchParams<{
		contractId: string;
	}>();
	const [formData, setFormData] = useState<FormData>({
		addressTo: '',
		amount: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [hasToken, setHasToken] = useState(false);
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);

	useEffect(() => {
		const initForm = async () => {
			const currentAddress = getCurrentAccountAddress();
			const token = await getFT(contractId, currentAddress);
			setHasToken(!!token);
		};

		initForm();
	}, [contractId]);

	// 验证地址
	const validateAddress = (address: string) => {
		if (!address) return 'Address is required';
		if (address.length !== 33 && address.length !== 34) {
			return 'Address must be 33 or 34 characters long';
		}
		return '';
	};

	// 验证金额
	const validateAmount = (amount: string) => {
		if (!amount) return 'Amount is required';
		const num = Number(amount);
		if (isNaN(num) || num <= 0) {
			return 'Please enter a valid positive number';
		}
		return '';
	};

	const validatePassword = async (password: string) => {
		if (!password) return 'Password is required';

		const isValid = verifyPassword(password, getPassKey(), getSalt());
		return isValid ? '' : 'Invalid password';
	};

	const handleInputChange = async (field: keyof FormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		// 实时验证
		let error = '';
		switch (field) {
			case 'addressTo':
				error = validateAddress(value);
				break;
			case 'amount':
				error = validateAmount(value);
				break;
			case 'password':
				error = await validatePassword(value);
				break;
		}

		setFormErrors((prev) => ({ ...prev, [field]: error }));
	};

	// 计算手续费
	const calculateEstimatedFee = useCallback(async () => {
		if (!formData.addressTo || !formData.amount || !formData.password) return;

		const addressError = validateAddress(formData.addressTo);
		const amountError = validateAmount(formData.amount);
		const passwordError = await validatePassword(formData.password);

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
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error instanceof Error ? error.message : 'Failed to calculate fee',
			});
			setEstimatedFee(null);
		} finally {
			setIsCalculatingFee(false);
		}
	}, [formData, contractId]);

	// 监听表单变化
	useEffect(() => {
		calculateEstimatedFee();
	}, [formData, calculateEstimatedFee]);

	// 处理提交
	const handleSubmit = async () => {
		// 验证所有字段
		const addressError = validateAddress(formData.addressTo);
		const amountError = validateAmount(formData.amount);
		const passwordError = await validatePassword(formData.password);

		const newErrors = {
			addressTo: addressError,
			amount: amountError,
			password: passwordError,
		};

		setFormErrors(newErrors);

		// 如果有错误，显示提示并返回
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

			await finish_transaction(result.txHex, result.utxos!);
			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'Transaction completed successfully',
			});
			router.back();
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error instanceof Error ? error.message : 'Transaction failed',
			});
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.inputGroup}>
				<Text style={styles.label}>Recipient Address</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.addressTo && styles.inputError]}
						value={formData.addressTo}
						onChangeText={(text) => handleInputChange('addressTo', text)}
						placeholder="Enter recipient address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{formErrors.addressTo && <Text style={styles.errorText}>{formErrors.addressTo}</Text>}
					{formData.addressTo.length > 0 && (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => handleInputChange('addressTo', '')}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
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
					{formErrors.amount && <Text style={styles.errorText}>{formErrors.amount}</Text>}
					{formData.amount.length > 0 && (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => handleInputChange('amount', '')}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
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
					{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
					{formData.password.length > 0 && (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => handleInputChange('password', '')}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
			</View>

			<View style={styles.divider} />
			<Text style={styles.feeTitle}>Estimated Fee:</Text>
			{isCalculatingFee ? (
				<ActivityIndicator size="small" color="#666" />
			) : (
				estimatedFee !== null && (
					<View style={styles.feeContainer}>
						<Text style={styles.feeLabel}>Estimated Fee:</Text>
						<Text style={styles.feeAmount}>{estimatedFee.toFixed(8)} Satoshis</Text>
					</View>
				)
			)}

			<TouchableOpacity
				style={[
					styles.submitButton,
					(Object.values(formErrors).some((error) => error) || isCalculatingFee) &&
						styles.submitButtonDisabled,
				]}
				onPress={handleSubmit}
				disabled={Object.values(formErrors).some((error) => error) || isCalculatingFee}
			>
				<Text style={styles.submitButtonText}>Transfer</Text>
			</TouchableOpacity>
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
	label: {
		fontSize: hp(1.6),
		color: '#333',
		marginBottom: hp(1),
		fontWeight: '500',
		paddingLeft: wp(1),
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
		padding: wp(1),
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
	feeTitle: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
		paddingHorizontal: wp(1),
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
		color: '#666',
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
		fontSize: hp(1.2),
		marginTop: hp(0.5),
		paddingLeft: wp(1),
	},
	submitButtonDisabled: {
		backgroundColor: '#666',
	},
});

export default TokenTransferPage;
