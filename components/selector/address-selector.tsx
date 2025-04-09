import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
	FlatList,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from 'react-native';

import { hp, wp } from '@/lib/common';
import { getAllAddressesFromBook, getAllMultiSigAddresses } from '@/utils/sqlite';

interface AddressSelectorProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (address: string) => void;
	userAddress: string;
}

export const AddressSelector = ({
	visible,
	onClose,
	onSelect,
	userAddress,
}: AddressSelectorProps) => {
	const [addresses, setAddresses] = useState<string[]>([]);
	const [multiSigAddresses, setMultiSigAddresses] = useState<string[]>([]);

	useEffect(() => {
		if (visible) {
			loadAddresses();
		}
	}, [visible]);

	const loadAddresses = async () => {
		try {
			const bookAddresses = await getAllAddressesFromBook();

			const currentAddress = userAddress;

			if (!bookAddresses.includes(currentAddress)) {
				setAddresses([currentAddress, ...bookAddresses]);
			} else {
				setAddresses(bookAddresses);
			}

			const multiSigs = await getAllMultiSigAddresses(userAddress);
			setMultiSigAddresses(multiSigs);
		} catch (error) {
			console.error('Failed to load addresses:', error);
		}
	};

	const handleSelect = (address: string) => {
		onSelect(address);
		onClose();
	};

	const renderAddressItem = ({ item }: { item: string }) => (
		<TouchableOpacity style={styles.addressItem} onPress={() => handleSelect(item)}>
			<View style={{ flex: 1 }}>
				<Text style={styles.addressText}>{item}</Text>
				{item === userAddress && <Text style={styles.currentAddressLabel}>Current Account</Text>}
			</View>
		</TouchableOpacity>
	);

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={styles.modalContainer}>
					<TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
						<View style={styles.modalContent}>
							<View style={styles.header}>
								<Text style={styles.title}>Select Address</Text>
								<TouchableOpacity onPress={onClose} style={styles.closeButton}>
									<Ionicons name="close" size={24} color="#000" />
								</TouchableOpacity>
							</View>

							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Addresses</Text>
								{addresses.length > 0 ? (
									<FlatList
										data={addresses}
										renderItem={renderAddressItem}
										keyExtractor={(item) => item}
										style={styles.list}
										ItemSeparatorComponent={() => <View style={styles.separator} />}
										showsVerticalScrollIndicator={false}
									/>
								) : (
									<Text style={styles.emptyText}>No addresses in your address book</Text>
								)}
							</View>

							<View style={styles.section}>
								<Text style={styles.sectionTitle}>Associated MultiSig Addresses</Text>
								{multiSigAddresses.length > 0 ? (
									<FlatList
										data={multiSigAddresses}
										renderItem={renderAddressItem}
										keyExtractor={(item) => item}
										style={styles.list}
										ItemSeparatorComponent={() => <View style={styles.separator} />}
										showsVerticalScrollIndicator={false}
									/>
								) : (
									<Text style={styles.emptyText}>No associated MultiSig addresses</Text>
								)}
							</View>
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: 'white',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: wp(4),
		paddingBottom: hp(4),
		maxHeight: hp(70),
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: hp(2),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	title: {
		fontSize: hp(2.2),
		fontWeight: '600',
	},
	closeButton: {
		padding: wp(1),
	},
	section: {
		marginTop: hp(2),
	},
	sectionTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(1),
	},
	list: {
		maxHeight: hp(20),
	},
	addressItem: {
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(3),
		backgroundColor: '#f8f8f8',
	},
	separator: {
		height: 1,
		backgroundColor: '#e0e0e0',
	},
	addressText: {
		fontSize: hp(1.8),
		color: '#333',
	},
	emptyText: {
		textAlign: 'center',
		color: '#999',
		marginTop: hp(1),
		marginBottom: hp(2),
		fontSize: hp(1.5),
	},
	currentAddressLabel: {
		fontSize: hp(1.2),
		color: '#007AFF',
		marginTop: hp(0.5),
	},
});
