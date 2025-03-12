import { MaterialIcons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RoundButton } from '@/components/ui/round-button';
import { useAccount } from '@/hooks/useAccount';
import { formatBalance } from '@/lib/util';

export const BalanceCard = () => {
	const { getCurrentAccountBalance } = useAccount();
	const balance = getCurrentAccountBalance();

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View>
					<Text style={styles.title}>TBC Balance</Text>
					<Text style={styles.balance}>{formatBalance(balance?.tbc ?? 0)} TBC</Text>
				</View>
				<TouchableOpacity onPress={() => {}} style={styles.qrButton}>
					<MaterialIcons name="qr-code" size={28} color="#666" />
				</TouchableOpacity>
			</View>
			<View style={styles.buttonGroup}>
				<Link href="/(tabs)/home/send" asChild>
					<RoundButton icon="send" label="Send" />
				</Link>
				<Link href="/(tabs)/home/history" asChild>
					<RoundButton icon="history" label="History" />
				</Link>
				<Link href="/(tabs)/home/multiSig" asChild>
					<RoundButton icon="people" label="MultiSig" />
				</Link>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#f0f0f0',
		borderRadius: 12,
		padding: 20,
		marginHorizontal: 20,
		marginBottom: 30,
		width: '90%',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
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
	},
	qrButton: {
		padding: 8,
	},
	buttonGroup: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		paddingTop: 10,
	},
});
