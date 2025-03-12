import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RoundButton } from '@/components/ui/round-button';

export const ButtonGroup = () => {
	return (
		<View style={styles.container}>
			<Link href="/(tabs)/home/send" asChild>
				<RoundButton icon="send" label="Send" />
			</Link>
			<Link href="/(tabs)/home/receive" asChild>
				<RoundButton icon="qr-code" label="Receive" />
			</Link>
			<Link href="/(tabs)/home/history" asChild>
				<RoundButton icon="history" label="History" />
			</Link>
			<Link href="/(tabs)/home/multiSig" asChild>
				<RoundButton icon="people" label="MultiSig" />
			</Link>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
		paddingHorizontal: 20,
		width: '100%',
		marginVertical: 20,
	},
});
