import React, { useState } from 'react';
import {
	View,
	Text,
	Image,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { wp, hp } from '@/lib/common';

interface DApp {
	id: string;
	name: string;
	description: string;
	icon: any;
	url: string;
}

const dapps: DApp[] = [
	{
		id: 'onion',
		name: 'OnionSwap',
		description: 'Transaction aggregator based on TBC network',
		icon: require('@/assets/images/onion.jpg'),
		url: 'https://dapp.onionswap.info/',
	},
	{
		id: 'bison',
		name: 'BisonSwap',
		description: 'Decentralized trading platform based on UTXOs',
		icon: require('@/assets/images/bison.png'),
		url: 'https://app.bisonswap.com/',
	},
	{
		id: 'shell',
		name: 'ShellSwap',
		description: "AMM Dex for Bitcoin's native smart contract layer",
		icon: require('@/assets/images/shell.png'),
		url: 'https://dev.shellswap.org/',
	},
	{
		id: 'ave',
		name: 'Ave',
		description: 'Dex quotation tool',
		icon: require('@/assets/images/ave.png'),
		url: 'https://ave.ai/',
	},
	{
		id: 'utxopump',
		name: 'utxopump',
		description: 'Release TBC20 token',
		icon: require('@/assets/images/utxopump.jpg'),
		url: 'https://utxopump.fun/',
	},
	{
		id: 'explorer',
		name: 'TBC Explorer',
		description: 'TBC explorer',
		icon: require('@/assets/images/explorer.png'),
		url: 'https://explorer.turingbitchain.io/',
	},
	{
		id: 'bitbus',
		name: 'Bitbus',
		description: 'Inscriptions cross the chain platform',
		icon: require('@/assets/images/bitbus.png'),
		url: 'https://bitbus.net/',
	},
];

export default function DAppPage() {
	const [searchText, setSearchText] = useState('');

	const filteredDapps = dapps.filter(
		(dapp) =>
			dapp.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
			dapp.url.toLowerCase().includes(searchText.toLowerCase()),
	);

	return (
		<ScreenWrapper bg="#f5f5f5">
			<Navbar />
			<View style={styles.container}>
				<View style={styles.searchContainer}>
					<View style={styles.searchInputContainer}>
						<MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
						<TextInput
							style={styles.searchInput}
							placeholder="Search by name or URL..."
							value={searchText}
							onChangeText={setSearchText}
						/>
						{searchText.length > 0 && (
							<TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
								<MaterialIcons name="close" size={20} color="#999" />
							</TouchableOpacity>
						)}
					</View>
				</View>

				<ScrollView style={styles.scrollView}>
					<View style={styles.listContainer}>
						{filteredDapps.length > 0 ? (
							filteredDapps.map((dapp) => (
								<TouchableOpacity key={dapp.id} style={styles.dappItem}>
									<Image source={dapp.icon} style={styles.icon} />
									<View style={styles.dappInfo}>
										<Text style={styles.name}>{dapp.name}</Text>
										<Text style={styles.description} numberOfLines={1}>
											{dapp.description}
										</Text>
									</View>
								</TouchableOpacity>
							))
						) : (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>
									{searchText ? 'No matching DApps found' : 'No DApps found'}
								</Text>
							</View>
						)}
					</View>
				</ScrollView>
			</View>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	searchContainer: {
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.5),
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
	},
	searchInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eeeeee',
		borderRadius: 8,
		paddingHorizontal: wp(2),
	},
	searchIcon: {
		marginRight: wp(1),
	},
	searchInput: {
		flex: 1,
		height: hp(4.5),
		fontSize: hp(1.6),
	},
	clearButton: {
		padding: wp(1),
	},
	scrollView: {
		flex: 1,
		paddingTop: hp(1),
	},
	listContainer: {
		backgroundColor: '#f5f5f5',
	},
	dappItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#f5f5f5',
	},
	icon: {
		width: wp(10),
		height: wp(10),
		borderRadius: wp(2),
	},
	dappInfo: {
		flex: 1,
		marginLeft: wp(3),
	},
	name: {
		fontSize: hp(1.8),
		fontWeight: '500',
		marginBottom: hp(0.5),
		color: '#000',
	},
	description: {
		fontSize: hp(1.4),
		color: '#666',
	},
	emptyContainer: {
		padding: wp(4),
		alignItems: 'center',
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
	},
});
