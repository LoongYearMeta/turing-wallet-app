import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { getTbcBalance_byMultiSigAddress } from '@/actions/get-balance';
import { AssetSelector } from '@/components/selector/asset-selector';
import { MultiSigAddressSelector } from '@/components/selector/multiSig-address-selector';
import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { formatBalance_tbc, formatBalance_token } from '@/lib/util';
import { getActiveMultiSigs } from '@/utils/sqlite';
import { fetchFTs_multiSig } from '@/actions/get-fts';
import { Asset } from '@/types';
import { getUTXOsCount_multiSig } from '@/actions/get-utxos';

interface FormData {
	senderAddress: string;
	asset: string;
	password: string;
}

interface FormErrors {
	senderAddress?: string;
	asset?: string;
	password?: string;
}

interface MultiSigAddress {
	multiSig_address: string;
	pubKeys: string[];
}

export default function MergeMultiSigTransactionPage() {
	const { t } = useTranslation();
	const { getCurrentAccountAddress, getPassKey, getSalt } = useAccount();
	const { createMultiSigTransaction_merge } = useFtTransaction();

	const [formData, setFormData] = useState<FormData>({
		senderAddress: '',
		asset: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [isLoading, setIsLoading] = useState(false);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
	const [showAssetSelector, setShowAssetSelector] = useState(false);
	const [multiSigAddresses, setMultiSigAddresses] = useState<MultiSigAddress[]>([]);
	const [showMultiSigAddressSelector, setShowMultiSigAddressSelector] = useState(false);
	const [utxoCount, setUtxoCount] = useState<number | null>(null);
	const [loadingUtxoCount, setLoadingUtxoCount] = useState(false);

	const currentAddress = getCurrentAccountAddress();
	const passKey = getPassKey();
	const salt = getSalt();

	useEffect(() => {
		loadMultiSigAddresses();
	}, []);

	useEffect(() => {
		if (formData.senderAddress && formData.asset) {
			fetchUtxoCount();
		}
	}, [formData.senderAddress, formData.asset]);

	const fetchUtxoCount = async () => {
		if (!formData.senderAddress || !formData.asset) return;

		setLoadingUtxoCount(true);
		try {
			const contractId = formData.asset !== 'TBC' ? formData.asset : undefined;
			const count = await getUTXOsCount_multiSig(formData.senderAddress, contractId);
			setUtxoCount(count);
		} catch (error) {
			setUtxoCount(0);
		} finally {
			setLoadingUtxoCount(false);
		}
	};

	const loadMultiSigAddresses = async () => {
		try {
			const activeMultiSigs = await getActiveMultiSigs(currentAddress);
			setMultiSigAddresses(activeMultiSigs);

			if (activeMultiSigs.length > 0) {
				const firstAddress = activeMultiSigs[0].multiSig_address;
				setFormData((prev) => ({ ...prev, senderAddress: firstAddress }));

				await loadAssets(firstAddress);
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadMultiSigAddresses'),
				visibilityTime: 2000,
			});
		}
	};

	const loadAssets = async (address: string) => {
		try {
			const tbcBalance = await getTbcBalance_byMultiSigAddress(address);
			const assetList: Asset[] = [{ label: 'TBC', value: 'TBC', balance: tbcBalance || 0 }];
			const response = await fetchFTs_multiSig(address);

			for (const token of response.token_list) {
				assetList.push({
					label: token.ft_symbol || token.ft_name,
					value: token.ft_contract_id,
					balance: token.ft_balance,
					contractId: token.ft_contract_id,
				});
			}

			setAssets(assetList);

			const tbcAsset = assetList.find((asset) => asset.value === 'TBC');
			if (tbcAsset) {
				setSelectedAsset(tbcAsset);
				setFormData((prev) => ({ ...prev, asset: 'TBC' }));
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadAssets'),
				visibilityTime: 2000,
			});
		}
	};

	const handleSelectMultiSigAddress = async (address: string) => {
		setFormData((prev) => ({
			...prev,
			senderAddress: address,
			asset: '',
		}));
		setSelectedAsset(null);
		setFormErrors((prev) => ({
			...prev,
			senderAddress: undefined,
			asset: undefined,
		}));
		setShowMultiSigAddressSelector(false);
		await loadAssets(address);
	};

	const handleAssetSelect = (asset: Asset) => {
		setSelectedAsset(asset);
		setShowAssetSelector(false);
		setFormData((prev) => ({
			...prev,
			asset: asset.value,
		}));
		setFormErrors((prev) => ({
			...prev,
			asset: undefined,
		}));
		setUtxoCount(null);
	};

	const handleInputChange = (field: keyof FormData, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
		setFormErrors((prev) => ({
			...prev,
			[field]: undefined,
		}));
	};

	const validateForm = async (): Promise<boolean> => {
		const errors: FormErrors = {};

		if (!formData.senderAddress) {
			errors.senderAddress = t('senderAddressRequired');
		}

		if (!formData.asset) {
			errors.asset = t('assetRequired');
		}

		if (!formData.password) {
			errors.password = t('passwordRequired');
		} else {
			try {
				const isValid = await verifyPassword(formData.password, passKey!, salt!);
				if (!isValid) {
					errors.password = t('incorrectPassword');
				}
			} catch (error) {
				errors.password = t('passwordVerificationFailed');
			}
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async () => {
		try {
			const isValid = await validateForm();
			if (!isValid) return;

			setIsLoading(true);

			try {
				if (formData.asset === 'TBC') {
					await createMultiSigTransaction_merge(formData.senderAddress, formData.password);
				} else {
					await createMultiSigTransaction_merge(
						formData.senderAddress,
						formData.password,
						formData.asset,
					);
				}

				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('mergeTransactionInitiated'),
					visibilityTime: 3000,
				});

				await loadAssets(formData.senderAddress);
				setFormData((prev) => ({ ...prev, password: '' }));
				router.back();
			} catch (error: any) {
				Toast.show({
					type: 'error',
					text1: t('error'),
					text2: error.message || t('mergeTransactionFailed'),
					visibilityTime: 3000,
				});
			} finally {
				setIsLoading(false);
			}
		} catch (error: any) {
			setIsLoading(false);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: error.message || t('unknownError'),
				visibilityTime: 2000,
			});
		}
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: '#fff' }}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={100}
		>
			<ScrollView
				style={{ flex: 1 }}
				contentContainerStyle={{ padding: wp(4), paddingTop: hp(3) }}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('senderAddress')}</Text>
						<TouchableOpacity onPress={() => setShowMultiSigAddressSelector(true)}>
							<Ionicons name="book-outline" size={20} color="#333" />
						</TouchableOpacity>
					</View>
					{formData.senderAddress && (
						<View style={styles.selectedAssetWrapper}>
							<Text style={styles.selectedAssetText}>{formData.senderAddress}</Text>
						</View>
					)}
					{formErrors.senderAddress && (
						<Text style={styles.errorText}>{formErrors.senderAddress}</Text>
					)}
				</View>

				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('asset')}</Text>
						<TouchableOpacity
							onPress={() => {
								if (assets.length > 0) {
									setShowAssetSelector(true);
								} else {
									Toast.show({
										type: 'info',
										text1: t('info'),
										text2: t('noAssetsAvailable'),
										visibilityTime: 2000,
									});
								}
							}}
						>
							<MaterialIcons name="account-balance-wallet" size={24} color={theme.colors.primary} />
						</TouchableOpacity>
					</View>
					{selectedAsset && (
						<View style={styles.selectedAssetWrapper}>
							<Text style={styles.selectedAssetText}>
								{selectedAsset.label}:{' '}
								{selectedAsset.value === 'TBC'
									? formatBalance_tbc(selectedAsset.balance)
									: formatBalance_token(selectedAsset.balance)}
							</Text>
						</View>
					)}
					{formErrors.asset && <Text style={styles.errorText}>{formErrors.asset}</Text>}
				</View>

				{/* UTXO Count Display */}
				{selectedAsset && (
					<View style={styles.inputGroup}>
						<View style={styles.labelRow}>
							<Text style={styles.label}>{t('utxoCount')}</Text>
						</View>
						<View style={styles.selectedAssetWrapper}>
							{loadingUtxoCount ? (
								<ActivityIndicator size="small" color={theme.colors.primary} />
							) : (
								<Text style={styles.selectedAssetText}>{utxoCount !== null ? utxoCount : '-'}</Text>
							)}
						</View>
					</View>
				)}

				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('password')}</Text>
					</View>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.password && styles.inputError]}
							value={formData.password}
							onChangeText={(text) => handleInputChange('password', text)}
							placeholder={t('enterPassword')}
							secureTextEntry
						/>
						{formData.password.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => {
									setFormData((prev) => ({ ...prev, password: '' }));
									setFormErrors((prev) => ({ ...prev, password: undefined }));
								}}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
				</View>

				<TouchableOpacity
					style={[styles.mergeButton, isLoading && styles.mergeButtonDisabled]}
					onPress={handleSubmit}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.mergeButtonText}>{t('mergeTransaction')}</Text>
					)}
				</TouchableOpacity>
			</ScrollView>

			<MultiSigAddressSelector
				visible={showMultiSigAddressSelector}
				onClose={() => setShowMultiSigAddressSelector(false)}
				onSelect={handleSelectMultiSigAddress}
				addresses={multiSigAddresses}
			/>
			<AssetSelector
				visible={showAssetSelector}
				onClose={() => setShowAssetSelector(false)}
				onSelect={handleAssetSelect}
				assets={assets}
				selectedAsset={selectedAsset}
			/>
		</KeyboardAvoidingView>
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
		paddingHorizontal: wp(1),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	balanceText: {
		fontSize: hp(1.4),
		color: '#666',
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
	inputText: {
		fontSize: hp(1.6),
		color: '#333',
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
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: wp(1),
	},
	mergeButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	mergeButtonDisabled: {
		opacity: 0.6,
	},
	mergeButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
	addressBookButton: {
		position: 'absolute',
		right: wp(2),
		padding: wp(2),
	},
	sendButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	sendButtonDisabled: {
		opacity: 0.6,
	},
	sendButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
});
