import '@/shim';
import { StyleSheet, Text, View } from 'react-native';

import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { wp } from '@/helpers/common';
import { useAccount } from '@/hooks/useAccount';

const HomePage = () => {
	const { getCurrentAccountAddress } = useAccount();
	const address = getCurrentAccountAddress();
	return (
		<ScreenWrapper bg="white">
			<Navbar title="Wallet" />
			<View style={styles.container}>
				<Text>{address}</Text>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	titleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	stepContainer: {
		gap: 8,
		marginBottom: 8,
	},
	reactLogo: {
		height: 178,
		width: 290,
		bottom: 0,
		left: 0,
		position: 'absolute',
	},
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
	},
});

export default HomePage;
