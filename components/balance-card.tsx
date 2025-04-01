import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { getExchangeRate, getTbcBalance } from '@/actions/get-balance';
import { get_BTC_AddressBalance, getBTCPriceInfo } from '@/actions/get-btc-information';
import { RoundButton } from '@/components/ui/round-button';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { formatBalance, formatBalance_btc } from '@/lib/util';
import { AccountType } from '@/types';

export const BalanceCard = () => {
	const {
		getCurrentAccountAddress,
		getCurrentAccountBalance,
		updateCurrentAccountTbcBalance,
		updateCurrentAccountBtcBalance,
		getCurrentAccountType,
	} = useAccount();

	const balance = getCurrentAccountBalance();
	const address = getCurrentAccountAddress();
	const accountType = getCurrentAccountType();
	const [rate, setRate] = useState(0);
	const [changePercent, setChangePercent] = useState(0);
	const [isLoading, setIsLoading] = useState(false);

	const disableMultiSig =
		accountType === AccountType.TAPROOT ||
		accountType === AccountType.TAPROOT_LEGACY ||
		accountType === AccountType.LEGACY;
	const displayBtc = accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY;
	const displayBalance = displayBtc ? (balance?.btc ?? 0) : (balance?.tbc ?? 0);
	const totalAssets = displayBalance * rate;

	const handleCopyAddress = async () => {
		if (address) {
			await Clipboard.setStringAsync(address);
			Toast.show({
				type: 'success',
				text1: 'Address copied to clipboard',
			});
		}
	};

	const isFocused = useIsFocused();

	useEffect(() => {
		if (isFocused) {
			const fetchData = async () => {
				if (isLoading) return;

				setIsLoading(true);
				try {
					const address = getCurrentAccountAddress();
					if (!address) return;

					if (displayBtc) {
						const [balanceData, priceInfo] = await Promise.all([
							get_BTC_AddressBalance(address).catch(() => ({ total: balance?.btc ?? 0 })),
							getBTCPriceInfo().catch(() => ({ 
								currentPrice: rate,
								priceChangePercent24h: changePercent
							}))
						]);

						await updateCurrentAccountBtcBalance(balanceData.total);
						setRate(priceInfo.currentPrice);
						setChangePercent(priceInfo.priceChangePercent24h);
					} else {
						const [balanceData, rateData] = await Promise.all([
							getTbcBalance(address).catch(() => balance?.tbc ?? 0),
							getExchangeRate().catch(() => ({ 
								rate: rate,
								changePercent: changePercent
							}))
						]);

						await updateCurrentAccountTbcBalance(balanceData);
						setRate(rateData.rate);
						setChangePercent(rateData.changePercent);
					}
				} catch (error) {
					console.error('Failed to fetch balance data:', error);
				} finally {
					setIsLoading(false);
				}
			};

			fetchData();
		}
	}, [isFocused, displayBtc]);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={styles.leftContent}>
					<Text style={styles.title}>{displayBtc ? 'BTC Balance' : 'TBC Balance'}</Text>
					<Text style={styles.balance}>
						{displayBtc ? formatBalance_btc(displayBalance) : formatBalance(displayBalance)}{' '}
						{displayBtc ? 'BTC' : 'TBC'}
					</Text>
					<View style={styles.rateContainer}>
						<Text style={styles.rateText}>${rate}</Text>
						<View style={styles.changeContainer}>
							<Text
								style={[styles.changeText, { color: changePercent >= 0 ? '#4CAF50' : '#FF5252' }]}
							>
								{changePercent >= 0 ? '+' : ''}
								{changePercent}%
							</Text>
							<MaterialIcons
								name={changePercent >= 0 ? 'arrow-upward' : 'arrow-downward'}
								size={16}
								color={changePercent >= 0 ? '#4CAF50' : '#FF5252'}
							/>
						</View>
					</View>
					<View style={styles.totalAssetsContainer}>
						<Text style={styles.totalAssetsLabel}>Total Assets:</Text>
						<Text style={styles.totalAssetsValue}>${totalAssets.toFixed(2)}</Text>
					</View>
				</View>
			</View>
			<View style={styles.addressRow}>
				<Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
					{address}
				</Text>
				<TouchableOpacity onPress={handleCopyAddress} style={styles.iconButton}>
					<MaterialIcons name="content-copy" size={16} color="#666" />
				</TouchableOpacity>
			</View>
			<View style={styles.buttonGroup}>
				<Link href="/(tabs)/home/send" asChild>
					<RoundButton icon="send" label="Send" />
				</Link>
				<Link href="/(tabs)/home/history" asChild>
					<RoundButton icon="history" label="History" />
				</Link>
				{disableMultiSig ? (
					<RoundButton icon="people" label="MultiSig" disabled={true} />
				) : (
					<Link href="/(tabs)/home/multiSig" asChild>
						<RoundButton icon="people" label="MultiSig" />
					</Link>
				)}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#e8e8e8',
		borderRadius: 16,
		padding: wp(4),
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		marginBottom: 30,
		width: '95%',
		alignSelf: 'center',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 8,
	},
	leftContent: {
		flex: 1,
		paddingRight: 16,
	},
	title: {
		fontSize: 16,
		color: '#666',
		marginBottom: 8,
	},
	balance: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#000',
		marginBottom: 4,
	},
	rateContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	rateText: {
		fontSize: 14,
		color: '#666',
	},
	changeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
	},
	changeText: {
		fontSize: 14,
	},
	totalAssetsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
		gap: 8,
	},
	totalAssetsLabel: {
		fontSize: 14,
		color: '#666',
	},
	totalAssetsValue: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000',
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: hp(1),
	},
	address: {
		flex: 1,
		fontSize: hp(1.4),
		color: '#666',
		marginRight: wp(2),
	},
	iconButton: {
		padding: 4,
		flexShrink: 0,
	},
	buttonGroup: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		paddingTop: 10,
	},
	disabledButton: {
		opacity: 0.5,
	},
});
