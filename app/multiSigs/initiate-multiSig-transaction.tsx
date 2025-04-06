import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import {
	getFTBalance_byMultiSigAddress,
	getTbcBalance_byMultiSigAddress,
} from '@/actions/get-balance';
import { AddressSelector } from '@/components/address-selector';
import { AssetSelector } from '@/components/asset-selector';
import { MultiSigAddressSelector } from '@/components/multiSig-address-selector';
import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { formatBalance } from '@/lib/util';
import { getActiveMultiSigs, getAllFTPublics } from '@/utils/sqlite';

interface FormData {
	senderAddress: string;
	asset: string;
	receiverAddress: string;
	amount: string;
	password: string;
}

interface FormErrors {
	senderAddress?: string;
	asset?: string;
	receiverAddress?: string;
	amount?: string;
	password?: string;
}

interface Asset {
	label: string;
	value: string;
	balance: number;
	contractId?: string;
}

interface MultiSigAddress {
	multiSig_address: string;
	pubKeys: string[];
}

export default function InitiateMultiSigTransactionPage() {
	const { getCurrentAccountType, getCurrentAccountAddress, getPassKey, getSalt } = useAccount();
	const { createMultiSigTransaction } = useFtTransaction();

	const [formData, setFormData] = useState<FormData>({
		senderAddress: '',
		asset: '',
		receiverAddress: '',
		amount: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [isLoading, setIsLoading] = useState(false);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
	const [showAssetSelector, setShowAssetSelector] = useState(false);
	const [multiSigAddresses, setMultiSigAddresses] = useState<MultiSigAddress[]>([]);
	const [showMultiSigAddressSelector, setShowMultiSigAddressSelector] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);

	const currentAddress = getCurrentAccountAddress();
	const passKey = getPassKey();
	const salt = getSalt();

	// Load multi-signature addresses
	useEffect(() => {
		loadMultiSigAddresses();
	}, []);

	const loadMultiSigAddresses = async () => {
		try {
			const activeMultiSigs = await getActiveMultiSigs(currentAddress);
			setMultiSigAddresses(activeMultiSigs);

			if (activeMultiSigs.length > 0) {
				// Auto-select the first multi-signature address
				const firstAddress = activeMultiSigs[0].multiSig_address;
				setFormData((prev) => ({ ...prev, senderAddress: firstAddress }));

				// Load assets for the selected address
				await loadAssets(firstAddress);
			}
		} catch (error) {
			console.error('Failed to load multi-signature addresses:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to load multi-signature addresses',
				visibilityTime: 3000,
			});
		}
	};

	// Load assets for the selected multi-signature address
	const loadAssets = async (address: string) => {
		try {
			// Start with TBC asset
			const tbcBalance = await getTbcBalance_byMultiSigAddress(address);
			const assetList: Asset[] = [{ label: 'TBC', value: 'TBC', balance: tbcBalance || 0 }];

			// Add token assets
			const ftPublics = await getAllFTPublics();

			// For each token, get its balance for the multi-signature address
			for (const ft of ftPublics) {
				try {
					const ftBalance = await getFTBalance_byMultiSigAddress(ft.id, address);
					assetList.push({
						label: ft.symbol || ft.name,
						value: ft.id,
						balance: ftBalance,
						contractId: ft.id,
					});
				} catch (error) {
					console.error(`Failed to get balance for token ${ft.id}:`, error);
				}
			}

			setAssets(assetList);

			// Auto-select TBC as the default asset
			const tbcAsset = assetList.find((asset) => asset.value === 'TBC');
			if (tbcAsset) {
				setSelectedAsset(tbcAsset);
				setFormData((prev) => ({ ...prev, asset: 'TBC' }));
			}
		} catch (error) {
			console.error('Failed to load assets:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to load assets for the selected address',
				visibilityTime: 3000,
			});
		}
	};

	// Handle multi-signature address selection
	const handleSelectMultiSigAddress = async (address: string) => {
		setFormData((prev) => ({ ...prev, senderAddress: address }));
		await loadAssets(address);
	};

	// Handle receiver address selection
	const handleSelectReceiverAddress = (address: string) => {
		setFormData((prev) => ({ ...prev, receiverAddress: address }));
		setFormErrors((prev) => ({ ...prev, receiverAddress: undefined }));
	};

	// Handle asset selection
	const handleAssetSelect = (asset: Asset) => {
		setSelectedAsset(asset);
		setFormData((prev) => ({ ...prev, asset: asset.value }));
	};

	// Validate form
	const validateForm = (): boolean => {
		const errors: FormErrors = {};

		if (!formData.senderAddress) {
			errors.senderAddress = 'Sender address is required';
		}

		if (!formData.asset) {
			errors.asset = 'Asset is required';
		}

		if (!formData.receiverAddress) {
			errors.receiverAddress = 'Receiver address is required';
		} else if (!/^[0-9a-zA-Z]{34,42}$/.test(formData.receiverAddress.trim())) {
			errors.receiverAddress = 'Invalid address format';
		}

		if (!formData.amount || isNaN(Number(formData.amount))) {
			errors.amount = 'Valid amount is required';
		} else if (Number(formData.amount) <= 0) {
			errors.amount = 'Amount must be greater than zero';
		} else if (selectedAsset && Number(formData.amount) > selectedAsset.balance) {
			errors.amount = 'Insufficient balance';
		}

		if (!formData.password) {
			errors.password = 'Password is required';
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	// Handle form submission
	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		setIsLoading(true);

		try {
			const isPasswordValid = verifyPassword(formData.password, passKey, salt);

			if (!isPasswordValid) {
				setFormErrors((prev) => ({ ...prev, password: 'Invalid password' }));
				setIsLoading(false);
				return;
			}

			// Create multi-signature transaction
			const contractId = selectedAsset?.value !== 'TBC' ? selectedAsset?.contractId : undefined;

			await createMultiSigTransaction(
				formData.senderAddress,
				formData.receiverAddress,
				Number(formData.amount),
				formData.password,
				contractId,
			);

			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'Transaction initiated successfully',
				visibilityTime: 3000,
			});

			// Navigate back to the multi-signature transactions page
			router.back();
		} catch (error) {
			console.error('Failed to initiate transaction:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error instanceof Error ? error.message : 'Failed to initiate transaction',
				visibilityTime: 3000,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Initiate Multi-Signature Transaction</Text>

			{/* Sender Address Field */}
			<View style={styles.formGroup}>
				<Text style={styles.label}>From MultiSig Address</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={[styles.input, formErrors.senderAddress && styles.inputError]}
						value={formData.senderAddress}
						onChangeText={(text) => {
							setFormData((prev) => ({ ...prev, senderAddress: text }));
							setFormErrors((prev) => ({ ...prev, senderAddress: undefined }));
						}}
						placeholder="Select sender address"
						editable={false}
					/>
					<TouchableOpacity
						style={styles.iconButton}
						onPress={() => setShowMultiSigAddressSelector(true)}
					>
						<MaterialIcons name="account-balance-wallet" size={24} color={theme.colors.primary} />
					</TouchableOpacity>
				</View>
				{formErrors.senderAddress && (
					<Text style={styles.errorText}>{formErrors.senderAddress}</Text>
				)}
			</View>

			{/* Asset Selection Field */}
			<View style={styles.formGroup}>
				<Text style={styles.label}>Asset</Text>
				<TouchableOpacity
					style={[styles.assetSelector, formErrors.asset && styles.inputError]}
					onPress={() => setShowAssetSelector(true)}
				>
					<Text style={styles.assetText}>
						{selectedAsset
							? `${selectedAsset.label} (${formatBalance(selectedAsset.balance)})`
							: 'Select asset'}
					</Text>
					<MaterialIcons name="arrow-drop-down" size={24} color="#666" />
				</TouchableOpacity>
				{formErrors.asset && <Text style={styles.errorText}>{formErrors.asset}</Text>}
			</View>

			{/* Receiver Address Field */}
			<View style={styles.formGroup}>
				<Text style={styles.label}>To Address</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={[styles.input, formErrors.receiverAddress && styles.inputError]}
						value={formData.receiverAddress}
						onChangeText={(text) => {
							setFormData((prev) => ({ ...prev, receiverAddress: text }));
							setFormErrors((prev) => ({ ...prev, receiverAddress: undefined }));
						}}
						placeholder="Enter receiver address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<TouchableOpacity style={styles.iconButton} onPress={() => setShowAddressSelector(true)}>
						<MaterialIcons name="menu-book" size={24} color={theme.colors.primary} />
					</TouchableOpacity>
				</View>
				{formErrors.receiverAddress && (
					<Text style={styles.errorText}>{formErrors.receiverAddress}</Text>
				)}
			</View>

			{/* Amount Field */}
			<View style={styles.formGroup}>
				<Text style={styles.label}>Amount</Text>
				<TextInput
					style={[styles.input, formErrors.amount && styles.inputError]}
					value={formData.amount}
					onChangeText={(text) => {
						setFormData((prev) => ({ ...prev, amount: text }));
						setFormErrors((prev) => ({ ...prev, amount: undefined }));
					}}
					placeholder="Enter amount"
					keyboardType="numeric"
				/>
				{formErrors.amount && <Text style={styles.errorText}>{formErrors.amount}</Text>}
			</View>

			{/* Password Field */}
			<View style={styles.formGroup}>
				<Text style={styles.label}>Password</Text>
				<TextInput
					style={[styles.input, formErrors.password && styles.inputError]}
					value={formData.password}
					onChangeText={(text) => {
						setFormData((prev) => ({ ...prev, password: text }));
						setFormErrors((prev) => ({ ...prev, password: undefined }));
					}}
					placeholder="Enter your password"
					secureTextEntry
				/>
				{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
			</View>

			{/* Submit Button */}
			<TouchableOpacity
				style={[styles.button, isLoading && styles.buttonDisabled]}
				onPress={handleSubmit}
				disabled={isLoading}
			>
				{isLoading ? (
					<ActivityIndicator color="#fff" size="small" />
				) : (
					<Text style={styles.buttonText}>Initiate Transaction</Text>
				)}
			</TouchableOpacity>

			{/* Asset Selector */}
			<AssetSelector
				visible={showAssetSelector}
				onClose={() => setShowAssetSelector(false)}
				onSelect={handleAssetSelect}
				assets={assets}
				selectedAsset={selectedAsset}
			/>

			{/* MultiSig Address Selector */}
			<MultiSigAddressSelector
				visible={showMultiSigAddressSelector}
				onClose={() => setShowMultiSigAddressSelector(false)}
				onSelect={handleSelectMultiSigAddress}
				addresses={multiSigAddresses}
			/>

			{/* Address Selector for Receiver */}
			<AddressSelector
				visible={showAddressSelector}
				onClose={() => setShowAddressSelector(false)}
				onSelect={handleSelectReceiverAddress}
				userAddress={currentAddress}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: wp(5),
		backgroundColor: '#fff',
	},
	title: {
		fontSize: hp(2.2),
		fontWeight: '600',
		marginBottom: hp(3),
		textAlign: 'center',
	},
	formGroup: {
		marginBottom: hp(2.5),
	},
	label: {
		fontSize: hp(1.6),
		marginBottom: hp(0.8),
		color: '#333',
		fontWeight: '500',
	},
	input: {
		height: hp(6),
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		fontSize: hp(1.8),
		backgroundColor: '#f9f9f9',
		flex: 1,
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	iconButton: {
		padding: wp(2),
		marginLeft: wp(2),
	},
	inputError: {
		borderColor: '#e53935',
	},
	errorText: {
		color: '#e53935',
		fontSize: hp(1.4),
		marginTop: hp(0.5),
	},
	button: {
		backgroundColor: theme.colors.primary,
		height: hp(6),
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: hp(2),
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	buttonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
	assetSelector: {
		height: hp(6),
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		backgroundColor: '#f9f9f9',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	assetText: {
		fontSize: hp(1.8),
		color: '#333',
	},
});
