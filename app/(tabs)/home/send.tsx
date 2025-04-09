import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

import { AddressSelector } from '@/components/selector/address-selector';
import { AssetSelector } from '@/components/selector/asset-selector';
import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { useBtcTransaction } from '@/hooks/useBtcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatBalance, formatFee, formatFee_btc, formatBalance_btc } from '@/lib/util';
import { getActiveFTs, getFT, removeFT, transferFT, upsertFT, type FT } from '@/utils/sqlite';
import { fetchUTXOs } from '@/actions/get-utxos';
import { AccountType } from '@/types';
import { theme } from '@/lib/theme';

interface FormData {
	asset: string;
	addressTo: string;
	amount: string;
	password: string;
}

interface FormErrors {
	asset?: string;
	addressTo?: string;
	amount?: string;
	password?: string;
}

interface Asset {
	label: string;
	value: string;
	balance: number;
	contractId?: string;
}

const formatDisplayAddress = (address: string) => {
	if (address.startsWith('bc1p')) {
		return `${address.slice(0, 20)}...${address.slice(-20)}`;
	}
	return address;
};

export default function SendPage() {
	const {
		getCurrentAccountAddress,
		getSalt,
		getPassKey,
		getCurrentAccountBalance,
		updateCurrentAccountUtxos,
		getAllAccountAddresses,
		getCurrentAccountType,
		getAddresses,
	} = useAccount();
	const { sendTbc, finish_transaction } = useTbcTransaction();
	const { sendFT } = useFtTransaction();
	const {
		createTransaction_taproot,
		createTransaction_legacy,
		getFeeRates,
		calculateTransactionFee,
		broadcastTransaction,
		getUTXOsFromBlockstream,
		selectOptimalUtxos,
	} = useBtcTransaction();
	const [formData, setFormData] = useState<FormData>({
		asset: '',
		addressTo: '',
		amount: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
	const [showAssetSelector, setShowAssetSelector] = useState(false);
	const [pendingTransaction, setPendingTransaction] = useState<{
		txHex: string;
		utxos: any[];
	} | null>(null);

	const currentAddress = getCurrentAccountAddress();
	const accountType = getCurrentAccountType();
	const passKey = getPassKey();
	const salt = getSalt();

	useEffect(() => {
		loadAssets();
	}, []);

	const loadAssets = async () => {
		try {
			if (accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY) {
				const btcBalance = getCurrentAccountBalance();
				const assetList: Asset[] = [
					{
						label: 'BTC',
						value: 'BTC',
						balance: Number(btcBalance?.btc || 0),
					},
				];
				setAssets(assetList);
				setSelectedAsset(assetList[0]);
				setFormData((prev) => ({ ...prev, asset: 'BTC' }));
			} else {
				const tbcBalance = getCurrentAccountBalance();
				const tokens = await getActiveFTs(currentAddress);
				const assetList: Asset[] = [
					{ label: 'TBC', value: 'TBC', balance: tbcBalance?.tbc || 0 },
					...tokens.map((token: FT) => ({
						label: token.name,
						value: token.id,
						balance: token.amount,
						contractId: token.id,
					})),
				];
				setAssets(assetList);
				const tbcAsset = assetList.find((asset) => asset.value === 'TBC');
				if (tbcAsset) {
					setSelectedAsset(tbcAsset);
					setFormData((prev) => ({ ...prev, asset: 'TBC' }));
				}
			}
		} catch (error) {
			console.error('Failed to load assets:', error);
		}
	};

	const validateAddress = (address: string) => {
		if (!address) return 'Address is required';
		if (!/^[a-zA-Z0-9]+$/.test(address)) return 'Invalid address';

		if (accountType === AccountType.TAPROOT_LEGACY) {
			if (!address.startsWith('1') || (address.length !== 33 && address.length !== 34)) {
				return 'Invalid legacy address format';
			}
		} else if (accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY) {
			if (
				!(
					(address.startsWith('1') && address.length === 34) ||
					(address.startsWith('bc1p') && address.length === 62)
				)
			) {
				return 'Invalid address format';
			}
		} else {
			if (address.startsWith('1')) {
				if (address.length !== 33 && address.length !== 34) return 'Invalid address';
			} else {
				if (address.length !== 34) return 'Invalid address';
			}
		}
		return '';
	};

	const validateAmount = (amountStr: string) => {
		if (!amountStr) return 'Amount is required';
		if (!selectedAsset) return 'Please select an asset first';

		const num = Number(amountStr);
		if (isNaN(num) || num <= 0) return 'Please enter a valid positive number';
		if (num > selectedAsset.balance) return 'Amount exceeds your balance';
		return '';
	};

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

	const handleInputChange = (field: keyof FormData, value: string) => {
		if (field === 'password') {
			value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		}

		const updatedFormData = { ...formData, [field]: value };
		setFormData(updatedFormData);

		let error = '';
		if (field === 'addressTo') {
			error = validateAddress(value);
		} else if (field === 'amount') {
			error = validateAmount(value);
		} else if (field === 'password') {
			debouncedPasswordValidation(value);

			return;
		}

		setFormErrors((prev) => ({ ...prev, [field]: error }));
	};

	const handleClearField = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));

		if (field === 'password' || field === 'addressTo' || field === 'amount') {
			setEstimatedFee(null);
		}
	};

	const handleAssetChange = (item: Asset) => {
		setSelectedAsset(item);
		setFormData((prev) => ({ ...prev, asset: item.value }));
		setEstimatedFee(null);
	};

	const calculateEstimatedFee = useCallback(async () => {
		if (!formData.addressTo || !formData.amount || !selectedAsset) return;
		if (!formData.password || formData.password.length < 6) return;

		const addressError = validateAddress(formData.addressTo);
		const amountError = validateAmount(formData.amount);
		if (addressError || amountError || formErrors.password) return;

		if (!passKey || !salt || !verifyPassword(formData.password, passKey, salt)) {
			return;
		}

		setIsCalculatingFee(true);
		try {
			let result;
			if (accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY) {
				const utxos = await getUTXOsFromBlockstream(currentAddress);
				const feeRates = await getFeeRates();
				const { selectedUtxos, totalInputAmount } = selectOptimalUtxos(
					utxos,
					Number(formData.amount),
					feeRates.medium,
				);
				const txHex =
					accountType === AccountType.TAPROOT
						? await createTransaction_taproot(
								formData.addressTo,
								Number(formData.amount),
								feeRates.medium,
								selectedUtxos,
								totalInputAmount,
								formData.password,
							)
						: await createTransaction_legacy(
								formData.addressTo,
								Number(formData.amount),
								feeRates.medium,
								selectedUtxos,
								totalInputAmount,
								formData.password,
							);
				const feeInfo = calculateTransactionFee(txHex, totalInputAmount);
				setEstimatedFee(feeInfo.fee);
				setPendingTransaction({ txHex, utxos: selectedUtxos });
			} else {
				if (selectedAsset.value === 'TBC') {
					result = await sendTbc(
						currentAddress,
						formData.addressTo,
						Number(formData.amount),
						formData.password,
					);
					setEstimatedFee(result.fee);
					setPendingTransaction(result);
				} else {
					result = await sendFT(
						selectedAsset.contractId!,
						currentAddress,
						formData.addressTo,
						Number(formData.amount),
						formData.password,
					);
					setEstimatedFee(result.fee);
					setPendingTransaction(result);
				}
			}
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
			setPendingTransaction(null);
		} finally {
			setIsCalculatingFee(false);
		}
	}, [formData, selectedAsset, formErrors.password]);

	useEffect(() => {
		calculateEstimatedFee();
	}, [formData]);

	const handleSubmit = async () => {
		if (!selectedAsset || !pendingTransaction) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Please wait for transaction preparation',
			});
			return;
		}

		try {
			if (accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY) {
				await broadcastTransaction(pendingTransaction.txHex);
			} else {
				try {
					await finish_transaction(pendingTransaction.txHex, pendingTransaction.utxos!);
				} catch (error: any) {
					if (
						error.message.includes('missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const utxos = await fetchUTXOs(currentAddress);
						await updateCurrentAccountUtxos(utxos, currentAddress);
						let result;
						if (selectedAsset.value === 'TBC') {
							result = await sendTbc(
								currentAddress,
								formData.addressTo,
								Number(formData.amount),
								formData.password,
							);
						} else {
							result = await sendFT(
								selectedAsset.contractId!,
								currentAddress,
								formData.addressTo,
								Number(formData.amount),
								formData.password,
							);
						}
						await finish_transaction(result.txHex, result.utxos!);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}

				const allAccountAddresses = getAllAccountAddresses();

				if (selectedAsset.value !== 'TBC') {
					if (formData.addressTo === currentAddress) {
					} else if (
						allAccountAddresses.includes(formData.addressTo) ||
						getAddresses().tbcAddress === formData.addressTo ||
						getAddresses().taprootLegacyAddress === formData.addressTo
					) {
						const receiverToken = await getFT(selectedAsset.contractId!, formData.addressTo);

						if (receiverToken) {
							await transferFT(
								selectedAsset.contractId!,
								Number(formData.amount),
								formData.addressTo,
							);
						} else {
							const senderToken = await getFT(selectedAsset.contractId!, currentAddress);
							if (senderToken) {
								await upsertFT(
									{
										id: selectedAsset.contractId!,
										name: senderToken.name,
										decimal: senderToken.decimal,
										amount: Number(formData.amount),
										symbol: senderToken.symbol,
										isDeleted: false,
									},
									formData.addressTo,
								);
							}
						}
						await transferFT(selectedAsset.contractId!, -Number(formData.amount), currentAddress);
						const updatedSenderToken = await getFT(selectedAsset.contractId!, currentAddress);
						if (updatedSenderToken && updatedSenderToken.amount <= 0) {
							await removeFT(selectedAsset.contractId!, currentAddress);
						}
					} else {
						await transferFT(selectedAsset.contractId!, -Number(formData.amount), currentAddress);
						const updatedSenderToken = await getFT(selectedAsset.contractId!, currentAddress);
						if (updatedSenderToken && updatedSenderToken.amount <= 0) {
							await removeFT(selectedAsset.contractId!, currentAddress);
						}
					}
				}
			}

			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'Transaction sent successfully',
			});

			router.back();
		} catch (error) {
			console.error('Transaction failed:', error);
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
				<View style={styles.labelRow}>
					<Text style={styles.label}>Asset</Text>
					{(accountType === AccountType.TBC || accountType === AccountType.TAPROOT_LEGACY) && (
						<TouchableOpacity onPress={() => setShowAssetSelector(true)}>
							<MaterialIcons name="account-balance-wallet" size={24} color={theme.colors.primary} />
						</TouchableOpacity>
					)}
				</View>
				{selectedAsset && (
					<View style={styles.selectedAssetWrapper}>
						<TouchableOpacity
							onPress={() => setShowAssetSelector(true)}
							style={{ flex: 1 }}
							disabled={accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY}
						>
							<Text style={styles.selectedAssetText}>
								{selectedAsset.label}:{' '}
								{selectedAsset.value === 'BTC'
									? formatBalance_btc(selectedAsset.balance)
									: formatBalance(selectedAsset.balance)}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>

			{/* Address Input */}
			<View style={styles.inputGroup}>
				<View style={styles.labelRow}>
					<Text style={styles.label}>Recipient Address</Text>
					<TouchableOpacity onPress={() => setShowAddressSelector(true)}>
						<Ionicons name="book-outline" size={20} color="#333" />
					</TouchableOpacity>
				</View>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[
							styles.input,
							formErrors.addressTo && styles.inputError,
							formData.addressTo.length > 0 && { color: 'transparent' },
						]}
						value={formData.addressTo}
						onChangeText={(text) => handleInputChange('addressTo', text)}
						placeholder="Enter recipient address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{formData.addressTo.length > 0 && (
						<View
							style={[styles.addressPreviewContainer, formErrors.addressTo && styles.inputError]}
						>
							<Text style={styles.addressPreview} numberOfLines={1}>
								{formatDisplayAddress(formData.addressTo)}
							</Text>
						</View>
					)}
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

			{/* Amount Input */}
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
				{formErrors.amount && <Text style={styles.errorText}>{formErrors.amount}</Text>}
			</View>

			{/* Password Input */}
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
							<Text style={styles.feeAmount}>
								{accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY
									? `${formatFee_btc(estimatedFee)} BTC`
									: `${formatFee(estimatedFee)} TBC`}
							</Text>
						)
					)}
				</View>
			</View>

			<TouchableOpacity
				style={[
					styles.sendButton,
					(!estimatedFee || Object.values(formErrors).some(Boolean) || isCalculatingFee) &&
						styles.sendButtonDisabled,
				]}
				onPress={handleSubmit}
				disabled={!estimatedFee || Object.values(formErrors).some(Boolean) || isCalculatingFee}
			>
				<Text style={styles.sendButtonText}>
					{isCalculatingFee ? 'Calculating Fee...' : 'Send'}
				</Text>
			</TouchableOpacity>

			<AddressSelector
				visible={showAddressSelector}
				onClose={() => setShowAddressSelector(false)}
				onSelect={(address) => handleInputChange('addressTo', address)}
				userAddress={currentAddress}
			/>

			<AssetSelector
				visible={showAssetSelector}
				onClose={() => setShowAssetSelector(false)}
				onSelect={handleAssetChange}
				assets={assets}
				selectedAsset={selectedAsset}
			/>
		</View>
	);
}

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
	selectedAssetWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginLeft: wp(1),
		marginTop: hp(0.5),
		backgroundColor: '#f8f8f8',
		padding: wp(2),
		borderRadius: 8,
	},
	selectedAssetText: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	clearAssetButton: {
		padding: wp(1),
	},
	errorText: {
		color: '#ff4444',
		fontSize: hp(1.4),
		marginTop: hp(0.5),
		marginLeft: wp(1),
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
	sendButton: {
		backgroundColor: '#000',
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	sendButtonDisabled: {
		backgroundColor: '#666',
	},
	sendButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
	inputError: {
		borderColor: '#ff4444',
	},
	addressPreviewContainer: {
		position: 'absolute',
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		paddingHorizontal: wp(3),
	},
	addressPreview: {
		fontSize: hp(1.6),
		color: '#333',
	},
});
