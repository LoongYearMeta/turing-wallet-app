import '@/shim';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BalanceCard } from '@/components/balance-card';
import { SearchFilterBar } from '@/components/search-filter-bar';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

const HomePage = () => {
	return (
		<ScreenWrapper bg="white">
			<Navbar />
			<ScrollView style={styles.container}>
				<View style={styles.content}>
					<BalanceCard />
					<SearchFilterBar
						onTabChange={(tab) => console.log('Tab changed:', tab)}
						onSearch={(text) => console.log('Search:', text)}
						onSort={(option) => console.log('Sort:', option)}
					/>
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
		alignItems: 'stretch',
		paddingTop: 20,
	},
});

export default HomePage;
