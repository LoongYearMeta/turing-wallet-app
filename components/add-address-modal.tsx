import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Modal } from '@/components/ui/modal';
import { hp, wp } from '@/lib/common';
import { formatLongString } from '@/lib/util';
import { addAddressToBook } from '@/utils/sqlite';

interface AddAddressModalProps {
	visible: boolean;
	onClose: () => void;
	onAddSuccess: () => void;
}

export const AddAddressModal = ({ visible, onClose, onAddSuccess }: AddAddressModalProps) => {
	const [address, setAddress] = useState('');
	const [error, setError] = useState('');

	const handleClose = () => {
		setAddress('');
		setError('');
		onClose();
	};

	const validateAddress = (address: string): boolean => {
		if (!address) {
			setError('Invalid address');
			return false;
		}

		if (!/^[a-zA-Z0-9]+$/.test(address)) {
			setError('Invalid address');
			return false;
		}

		if (address.startsWith('1')) {
			if (address.length !== 33 && address.length !== 34) {
				setError('Invalid address');
				return false;
			}
		} else if (address.startsWith('bc1p')) {
			if (address.length !== 62) {
				setError('Invalid address');
				return false;
			}
		} else {
			if (address.length !== 33) {
				setError('Invalid address');
				return false;
			}
		}

		setError('');
		return true;
	};

	const handleAddAddress = async () => {
		const trimmedAddress = address.trim();
		if (!validateAddress(trimmedAddress)) {
			return;
		}

		try {
			await addAddressToBook(trimmedAddress);
			setAddress('');
			onClose();
			onAddSuccess();
			Toast.show({
				type: 'success',
				text1: 'Success',
				text2: 'Address added to book',
			});
		} catch (error) {
			console.error('Failed to add address:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to add address',
			});
		}
	};

	const handleChangeText = (text: string) => {
		setAddress(text);
		if (error) {
			validateAddress(text.trim());
		}
	};

	return (
		<Modal visible={visible} onClose={handleClose}>
			<View style={styles.container}>
				<Text style={styles.title}>Add Address</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, error ? styles.inputError : null]}
						placeholder="Enter address"
						value={address}
						onChangeText={handleChangeText}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{address.trim() && (
						<TouchableOpacity style={styles.clearIcon} onPress={() => setAddress('')}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				{error ? (
					<Text style={styles.errorText}>{error}</Text>
				) : (
					address.trim() && (
						<Text style={styles.preview}>Preview: {formatLongString(address.trim(), 12)}</Text>
					)
				)}
				<TouchableOpacity style={styles.button} onPress={handleAddAddress}>
					<Text style={styles.buttonText}>Confirm</Text>
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
	inputError: {
		borderColor: '#ff4444',
	},
	clearIcon: {
		position: 'absolute',
		right: wp(2),
		height: hp(5),
		justifyContent: 'center',
		paddingHorizontal: wp(1),
	},
	preview: {
		fontSize: hp(1.4),
		color: '#666',
		marginBottom: hp(2),
	},
	errorText: {
		fontSize: hp(1.4),
		color: '#ff4444',
		marginBottom: hp(2),
	},
	button: {
		backgroundColor: '#000',
		paddingHorizontal: wp(6),
		paddingVertical: hp(1),
		borderRadius: 8,
		minWidth: wp(20),
		alignItems: 'center',
	},
	buttonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
});
