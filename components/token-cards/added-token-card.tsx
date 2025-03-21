import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { syncFTInfo } from '@/actions/get-ft';
import { hp, wp } from '@/lib/common';
import { formatBalance, formatContractId } from '@/lib/util';
import type { FTPublic } from '@/utils/sqlite';


interface AddedTokenCardProps {
	token: FTPublic;
	onDeletePress: (token: FTPublic) => void;
	onRefresh: () => void;
}

export const AddedTokenCard = ({ token, onDeletePress, onRefresh }: AddedTokenCardProps) => {
	const handleCopyId = async () => {
		await Clipboard.setStringAsync(token.id);
		Toast.show({
			type: 'success',
			text1: 'Contract address copied to clipboard',
		});
	};

	const handleRefresh = async () => {
		try {
			await syncFTInfo(token.id);
			onRefresh();
			Toast.show({
				type: 'success',
				text1: 'Token info refreshed',
			});
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Failed to refresh token info',
			});
		}
	};

	return (
		<View style={styles.card}>
			<View style={styles.topContent}>
				<View style={styles.leftContent}>
					<Text style={styles.title}>{token.name}</Text>
					<View style={styles.actions}>
						<TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
							<MaterialIcons name="refresh" size={22} color="#666" />
						</TouchableOpacity>
						<TouchableOpacity style={styles.actionButton} onPress={() => onDeletePress(token)}>
							<MaterialIcons name="delete" size={22} color="#666" />
						</TouchableOpacity>
					</View>
				</View>
				<View style={styles.rightContent}>
					<Text style={styles.amount}>{formatBalance(token.supply)}</Text>
					<View style={styles.valueContainer}>
						<Text style={styles.contractId}>{formatContractId(token.id)}</Text>
						<TouchableOpacity onPress={handleCopyId} style={styles.copyButton}>
							<MaterialIcons name="content-copy" size={16} color="#666" />
						</TouchableOpacity>
					</View>
					<View style={styles.infoRow}>
						<Text style={styles.info}>symbol: {token.symbol}</Text>
						<Text style={styles.info}>holders: {token.holds_count}</Text>
					</View>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#f5f5f5',
		padding: wp(3),
		marginBottom: hp(0.5),
		width: '100%',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		marginTop: hp(0.5),
	},
	topContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	leftContent: {
		flex: 1,
		marginRight: wp(3),
	},
	title: {
		fontSize: hp(2.2),
		fontWeight: '600',
		marginBottom: hp(1),
	},
	actions: {
		flexDirection: 'row',
		gap: wp(1),
	},
	rightContent: {
		alignItems: 'flex-end',
		gap: hp(0.5),
	},
	valueContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	contractId: {
		fontSize: hp(1.3),
		color: '#666',
	},
	copyButton: {
		padding: wp(1),
		marginLeft: wp(2),
	},
	amount: {
		fontSize: hp(1.8),
		fontWeight: '500',
	},
	infoRow: {
		flexDirection: 'row',
		gap: wp(3),
	},
	info: {
		fontSize: hp(1.3),
		color: '#666',
	},
	actionButton: {
		padding: wp(1),
	},
});
