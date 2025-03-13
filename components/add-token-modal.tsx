import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { syncFTInfo } from '@/actions/get-ft';
import { hp, wp } from '@/helpers/common';
import { useAccount } from '@/hooks/useAccount';
import { formatLongString } from '@/lib/util';
import { Modal } from './ui/modal';

import { getFT, restoreFT } from '@/utils/sqlite';

interface AddContractModalProps {
	visible: boolean;
	onClose: () => void;
}

export const AddContractModal = ({ visible, onClose }: AddContractModalProps) => {
	const [contractId, setContractId] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { getCurrentAccountAddress } = useAccount();
	const formattedId = formatLongString(contractId.trim());

	const handleClose = () => {
		setContractId('');
		onClose();
	};

	const handleSubmit = async () => {
		const trimmedId = contractId.trim();

		if (!trimmedId || trimmedId.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(trimmedId)) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Please enter a valid 64-character hexadecimal contract ID',
			});
			return;
		}

		setIsLoading(true);
		try {
			const userAddress = getCurrentAccountAddress();
			const existingFT = await getFT(trimmedId, userAddress);

			if (existingFT?.isDeleted) {
				await restoreFT(trimmedId, userAddress);
				await syncFTInfo(trimmedId);
				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: 'Token restored and added successfully',
				});
			} else {
				await syncFTInfo(trimmedId);
				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: 'Token added successfully',
				});
			}
			setContractId('');
			onClose();
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: error instanceof Error ? error.message : 'Failed to add token',
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal visible={visible} onClose={handleClose}>
			<View style={styles.container}>
				<Text style={styles.title}>Add Token</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={styles.input}
						placeholder="Enter contract ID"
						value={contractId}
						onChangeText={setContractId}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!isLoading}
					/>
					{contractId.trim() && (
						<TouchableOpacity
							style={styles.clearIcon}
							onPress={() => setContractId('')}
							disabled={isLoading}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				{contractId.trim() && <Text style={styles.preview}>Preview: {formattedId}</Text>}
				<TouchableOpacity
					style={[styles.button, isLoading && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.buttonText}>Confirm</Text>
					)}
				</TouchableOpacity>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
	},
	inputWrapper: {
		width: '100%',
		position: 'relative',
		marginBottom: hp(2),
	},
	input: {
		width: '100%',
		height: hp(5),
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		paddingRight: wp(10),
		fontSize: hp(1.6),
	},
	button: {
		backgroundColor: '#000',
		paddingHorizontal: wp(6),
		paddingVertical: hp(1),
		borderRadius: 8,
		minWidth: wp(20),
		alignItems: 'center',
	},
	buttonDisabled: {
		backgroundColor: '#666',
	},
	buttonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	preview: {
		fontSize: hp(1.4),
		color: '#666',
		marginBottom: hp(2),
	},
	clearIcon: {
		position: 'absolute',
		right: wp(2),
		height: hp(5),
		justifyContent: 'center',
		paddingHorizontal: wp(1),
	},
});
