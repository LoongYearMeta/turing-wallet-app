import '@/shim';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BalanceCard } from '@/components/balance-card';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

const HomePage = () => {
	return (
		<ScreenWrapper bg="white">
			<Navbar title="Home" />
			<ScrollView style={styles.container}>
				<View style={styles.content}>
					<BalanceCard />
				</View>
			</ScrollView>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		paddingTop: 20,
	},
});

export default HomePage;
