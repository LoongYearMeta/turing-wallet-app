import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { hp, wp } from '@/helpers/common';
import { formatBalance, formatContractId } from '@/lib/util';
import type { FTPublic } from '@/utils/sqlite';

interface AddedTokenCardProps {
	token: FTPublic;
	onTransferPress: (token: FTPublic) => void;
	onDeletePress: (token: FTPublic) => void;
}

export const AddedTokenCard = ({ token, onTransferPress, onDeletePress }: AddedTokenCardProps) => {
	const handleCopyId = async () => {
		await Clipboard.setStringAsync(token.id);
		Toast.show({
			type: 'success',
			text1: 'Contract address copied to clipboard',
		});
	};

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<Text style={styles.title}>{token.name}</Text>
				<View style={styles.actions}>
					<TouchableOpacity style={styles.actionButton} onPress={() => onTransferPress(token)}>
						<MaterialIcons name="send" size={20} color="#666" />
					</TouchableOpacity>
					<TouchableOpacity style={styles.actionButton} onPress={() => onDeletePress(token)}>
						<MaterialIcons name="delete" size={20} color="#666" />
					</TouchableOpacity>
				</View>
			</View>
			<View style={styles.content}>
				<View style={styles.idRow}>
					<Text style={styles.label}>Contract Address: </Text>
					<Text style={styles.contractId}>{formatContractId(token.id)}</Text>
					<TouchableOpacity onPress={handleCopyId} style={styles.copyButton}>
						<MaterialIcons name="content-copy" size={16} color="#666" />
					</TouchableOpacity>
				</View>
				<View style={styles.row}>
					<Text style={styles.label}>Supply: </Text>
					<Text style={styles.amount}>{formatBalance(token.supply)}</Text>
				</View>
				<View style={[styles.row, styles.lastRow]}>
					<View style={styles.infoItem}>
						<Text style={styles.label}>Symbol: </Text>
						<Text style={styles.value}>{token.symbol}</Text>
					</View>
					<View style={styles.infoItem}>
						<Text style={styles.label}>Decimal: </Text>
						<Text style={styles.value}>{token.decimal}</Text>
					</View>
				</View>
				<View style={[styles.row, styles.holdersRow]}>
					<Text style={styles.label}>Holders: </Text>
					<Text style={styles.value}>{token.holds_count}</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#f0f0f0',
		borderRadius: 12,
		padding: wp(4),
		marginBottom: hp(2),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		marginHorizontal: wp(6),
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: hp(2),
	},
	content: {
		flex: 1,
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(0.5),
	},
	lastRow: {
		marginTop: hp(1),
		marginBottom: hp(1),
	},
	holdersRow: {
		marginTop: hp(0.5),
	},
	idRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(1),
	},
	label: {
		fontSize: hp(1.4),
		color: '#666',
		minWidth: wp(12),
	},
	contractId: {
		fontSize: hp(1.4),
		color: '#666',
		flex: 1,
	},
	copyButton: {
		padding: wp(1),
		marginLeft: wp(2),
	},
	amount: {
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	infoItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginRight: wp(4),
	},
	value: {
		fontSize: hp(1.4),
		color: '#333',
	},
	actions: {
		flexDirection: 'row',
		gap: wp(1),
	},
	actionButton: {
		padding: wp(1),
	},
});
