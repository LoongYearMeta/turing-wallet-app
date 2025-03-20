import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useState, useEffect } from 'react';
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { useAccount } from '@/hooks/useAccount';
import { useNftTransaction } from '@/hooks/useNftTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatFee } from '@/lib/util';
import { addNFT, getCollection } from '@/utils/sqlite';
import { theme } from '@/lib/theme';
import { fetchNFTCounts_byCollection } from '@/actions/get-nfts';

interface FormData {
	name: string;
	description: string;
	image: string | null;
	password: string;
}

interface FormErrors {
	name?: string;
	description?: string;
	image?: string;
	password?: string;
}

const CreateNFTPage = () => {
	const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
	const [formData, setFormData] = useState<FormData>({
		name: '',
		description: '',
		image: null,
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [collection, setCollection] = useState<any>(null);

	const { getCurrentAccountAddress, getSalt, getPassKey } = useAccount();
	const { createNFT } = useNftTransaction();
	const { finish_transaction } = useTbcTransaction();

	// 加载合集信息
	useEffect(() => {
		const loadCollection = async () => {
			if (!collectionId) return;

			try {
				const collectionData = await getCollection(collectionId);
				setCollection(collectionData);
				// 使用合集图片作为默认图片
				setFormData((prev) => ({
					...prev,
					image: collectionData!.icon,
				}));
			} catch (error) {
				console.error('Failed to load collection:', error);
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Failed to load collection details',
				});
			}
		};

		loadCollection();
	}, [collectionId]);

	// 验证NFT名称
	const validateName = (name: string) => {
		if (!name) return 'NFT name is required';
		if (name.length < 1 || name.length > 20) return 'Name must be 1-20 characters';

		// 检查首尾不能有空格，中间可以有空格
		if (name.startsWith(' ') || name.endsWith(' ')) {
			return 'Name cannot start or end with spaces';
		}

		// 只允许字母、数字和空格
		if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
			return 'Name can only contain letters, numbers and spaces';
		}

		return '';
	};

	// 验证描述
	const validateDescription = (description: string) => {
		if (!description) return 'Description is required';
		if (description.length > 100) return 'Description must be less than 100 characters';
		return '';
	};

	// 验证图片
	const validateImage = (image: string | null) => {
		if (!image) return 'NFT image is required';
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

	// 计算估计手续费
	const calculateEstimatedFee = useCallback(async () => {
		if (
			!formData.name ||
			!formData.description ||
			!formData.image ||
			!formData.password ||
			!collectionId
		) {
			return;
		}

		const nameError = validateName(formData.name);
		const descriptionError = validateDescription(formData.description);
		const imageError = validateImage(formData.image);

		if (nameError || descriptionError || imageError) {
			return;
		}

		// 再次验证密码
		const passKey = getPassKey();
		const salt = getSalt();
		if (!passKey || !salt || !verifyPassword(formData.password, passKey, salt)) {
			return; // 密码验证失败，不计算手续费
		}

		setIsCalculatingFee(true);
		try {
			const userAddress = getCurrentAccountAddress();
			const nftData = {
				nftName: formData.name,
				symbol: formData.name, // 使用NFT名称作为symbol
				description: formData.description,
				attributes: formData.name, // 使用NFT名称作为attributes
				file: formData.image,
			};

			const transaction = await createNFT(collectionId, nftData, userAddress, formData.password);
			setEstimatedFee(transaction.fee);
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
	}, [
		formData,
		collectionId,
		validateName,
		validateDescription,
		validateImage,
		getPassKey,
		getSalt,
		getCurrentAccountAddress,
		createNFT,
	]);

	useEffect(() => {
		calculateEstimatedFee();
	}, [formData]);

	const handleInputChange = (field: keyof FormData, value: string) => {
		if (field === 'password') {
			value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		}

		const updatedFormData = { ...formData, [field]: value };
		setFormData(updatedFormData);

		let error = '';
		if (field === 'name') {
			error = validateName(value);
		} else if (field === 'description') {
			error = validateDescription(value);
		} else if (field === 'password') {
			debouncedPasswordValidation(value);
			return;
		}

		setFormErrors((prev) => ({ ...prev, [field]: error }));
	};

	// 处理清除输入
	const handleClearInput = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: field === 'image' ? null : '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));

		if (field === 'password' || field === 'name' || field === 'description' || field === 'image') {
			setEstimatedFee(null);
		}
	};

	// 处理图片选择
	const handlePickImage = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
				base64: true,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const selectedAsset = result.assets[0];

				// 检查文件大小
				const base64 = selectedAsset.base64;
				if (base64) {
					const fileSizeInBytes = Math.round((base64.length * 3) / 4);
					const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

					if (fileSizeInMB > 5) {
						Toast.show({
							type: 'error',
							text1: 'File too large',
							text2: 'Please select an image smaller than 5MB',
						});
						return;
					}

					// 更新表单数据
					const updatedFormData = { ...formData, image: `data:image/jpeg;base64,${base64}` };
					setFormData(updatedFormData);
					setFormErrors((prev) => ({ ...prev, image: '' }));
				}
			}
		} catch (error) {
			console.error('Error picking image:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to pick image',
			});
		}
	};

	// 创建NFT
	const handleCreateNFT = async () => {
		if (
			!formData.name ||
			!formData.description ||
			!formData.image ||
			!formData.password ||
			!estimatedFee ||
			!collectionId
		) {
			return;
		}

		try {
			setIsCreating(true);

			const userAddress = getCurrentAccountAddress();
			const nftData = {
				nftName: formData.name,
				symbol: formData.name,
				description: formData.description,
				attributes: formData.name,
				file: formData.image,
			};

			let collectionIndex = 0;
			try {
				collectionIndex = await fetchNFTCounts_byCollection(collectionId);
			} catch (error) {
				console.error('Error fetching collection index:', error);
			}

			const transaction = await createNFT(collectionId, nftData, userAddress, formData.password);

			const result = await finish_transaction(transaction.txHex, transaction.utxos);

			if (result) {
				await addNFT(
					{
						id: result,
						collection_id: collectionId,
						collection_index: collectionIndex + 1,
						name: formData.name,
						symbol: formData.name,
						description: formData.description,
						attributes: formData.name,
						transfer_times: 0,
						icon: formData.image,
						collection_name: collection?.name || '',
						isDeleted: false,
					},
					userAddress,
				);

				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: 'NFT created successfully',
				});

				// 返回到合集详情页面
				router.back();
			}
		} catch (error) {
			console.error('Error creating NFT:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2:
					typeof error === 'object' && error !== null && 'message' in error
						? String(error.message)
						: 'Failed to create NFT',
			});
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<View style={styles.container}>
			<ScrollView showsVerticalScrollIndicator={false}>
				{/* NFT名称 */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>NFT Name</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.name ? styles.inputError : null]}
							placeholder="Enter NFT name"
							value={formData.name}
							onChangeText={(text) => handleInputChange('name', text)}
							maxLength={20}
						/>
						{formData.name ? (
							<TouchableOpacity style={styles.clearButton} onPress={() => handleClearInput('name')}>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}
				</View>

				{/* 描述 */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Description</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[
								styles.input,
								styles.textArea,
								formErrors.description ? styles.inputError : null,
							]}
							placeholder="Enter NFT description"
							value={formData.description}
							onChangeText={(text) => handleInputChange('description', text)}
							multiline
							numberOfLines={4}
							maxLength={100}
							textAlignVertical="top"
						/>
						{formData.description ? (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearInput('description')}
							>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.description ? (
						<Text style={styles.errorText}>{formErrors.description}</Text>
					) : null}
				</View>

				{/* 图片选择 */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>NFT Image</Text>
					<TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
						{formData.image ? (
							<>
								<Image source={{ uri: formData.image }} style={styles.previewImage} />
								<TouchableOpacity
									style={styles.imageCloseButton}
									onPress={() => {
										// 完全清除图片，不重置为合集图片
										setFormData((prev) => ({
											...prev,
											image: null,
										}));
										setFormErrors((prev) => ({ ...prev, image: validateImage(null) }));
									}}
								>
									<MaterialIcons name="close" size={20} color="white" />
								</TouchableOpacity>
							</>
						) : (
							<View style={styles.imagePlaceholder}>
								<MaterialIcons name="add-photo-alternate" size={40} color="#999" />
								<Text style={styles.imagePlaceholderText}>Tap to select image (max 5MB)</Text>
							</View>
						)}
					</TouchableOpacity>
					{formErrors.image ? <Text style={styles.errorText}>{formErrors.image}</Text> : null}
				</View>

				{/* 密码 */}
				<View style={styles.formGroup}>
					<Text style={styles.label}>Password</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.password ? styles.inputError : null]}
							placeholder="Enter your password"
							value={formData.password}
							onChangeText={(text) => handleInputChange('password', text)}
							secureTextEntry
						/>
						{formData.password ? (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearInput('password')}
							>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.password ? <Text style={styles.errorText}>{formErrors.password}</Text> : null}
				</View>

				{/* 估计手续费 */}
				<View style={styles.feeContainer}>
					<Text style={styles.feeLabel}>Estimated Fee:</Text>
					<View style={styles.feeValueContainer}>
						{isCalculatingFee ? (
							<ActivityIndicator size="small" color={theme.colors.primary} />
						) : (
							estimatedFee !== null && (
								<Text style={styles.feeAmount}>{formatFee(estimatedFee)} TBC</Text>
							)
						)}
					</View>
				</View>

				{/* 创建按钮 */}
				<TouchableOpacity
					style={[
						styles.createButton,
						(!estimatedFee ||
							Object.values(formErrors).some(Boolean) ||
							isCalculatingFee ||
							isCreating) &&
							styles.createButtonDisabled,
					]}
					onPress={handleCreateNFT}
					disabled={
						!estimatedFee ||
						Object.values(formErrors).some(Boolean) ||
						isCalculatingFee ||
						isCreating
					}
				>
					<Text style={styles.createButtonText}>
						{isCreating ? 'Creating...' : isCalculatingFee ? 'Calculating Fee...' : 'Create NFT'}
					</Text>
				</TouchableOpacity>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: wp(4),
	},
	formGroup: {
		marginBottom: hp(1.5),
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
	textArea: {
		height: hp(10),
		textAlignVertical: 'top',
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
	imagePickerButton: {
		width: '100%',
		height: hp(30),
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		overflow: 'hidden',
	},
	imagePlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8f8f8',
	},
	imagePlaceholderText: {
		marginTop: hp(1),
		color: '#999',
		fontSize: hp(1.6),
	},
	previewImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	imageCloseButton: {
		position: 'absolute',
		top: wp(2),
		right: wp(2),
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: 15,
		width: 30,
		height: 30,
		justifyContent: 'center',
		alignItems: 'center',
	},
	feeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: hp(2),
		paddingHorizontal: wp(1),
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		marginTop: hp(2),
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
	createButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
		marginBottom: hp(4),
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

export default CreateNFTPage;
