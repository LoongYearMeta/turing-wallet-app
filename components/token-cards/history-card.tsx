import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { hp, wp } from '@/lib/common';
import { formatBalance, formatContractId, formatDate } from '@/lib/util';
import type { FTHistory } from '@/utils/sqlite';

interface HistoryCardProps {
	history: FTHistory;
}

export const HistoryCard = ({ history }: HistoryCardProps) => {

	const handleCopyId = async () => {
		await Clipboard.setStringAsync(history.id);
		Toast.show({
			type: 'success',
			text1: 'Transaction ID copied to clipboard',
		});
	};

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<View style={styles.idRow}>
					<Text style={styles.label}>TxID: </Text>
					<Text style={styles.value}>{formatContractId(history.id)}</Text>
					<TouchableOpacity onPress={handleCopyId} style={styles.copyButton}>
						<MaterialIcons name="content-copy" size={16} color="#666" />
					</TouchableOpacity>
				</View>
				<Text style={styles.timestamp}>{formatDate(history.timestamp)}</Text>
			</View>
			<View style={styles.content}>
				<View style={styles.row}>
					<Text style={styles.label}>Change: </Text>
					<Text
						style={[styles.value, history.balance_change > 0 ? styles.positive : styles.negative]}
					>
						{history.balance_change > 0 ? '+' : ''}
						{formatBalance(history.balance_change)}
					</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.label}>Fee: </Text>
					<Text style={styles.value}>{formatBalance(history.fee)}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.label}>From: </Text>
					<Text style={styles.value}>{history.send_address}</Text>
				</View>
				<View style={styles.row}>
					<Text style={styles.label}>To: </Text>
					<Text style={styles.value}>{history.receive_address}</Text>
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
		marginHorizontal: wp(2),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	header: {
		marginBottom: hp(2),
	},
	idRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(0.5),
	},
	copyButton: {
		padding: wp(1),
		marginLeft: wp(2),
	},
	timestamp: {
		fontSize: hp(1.4),
		color: '#666',
	},
	content: {
		gap: hp(1),
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	label: {
		fontSize: hp(1.4),
		color: '#666',
		width: wp(15),
	},
	value: {
		fontSize: hp(1.4),
		color: '#333',
		flex: 1,
	},
	positive: {
		color: '#4CAF50',
		fontWeight: '500',
	},
	negative: {
		color: '#F44336',
		fontWeight: '500',
	},
});
