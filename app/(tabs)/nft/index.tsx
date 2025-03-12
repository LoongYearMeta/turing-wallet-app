import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { wp } from '@/helpers/common';

const TokenPage = () => {
	return (
		<ScreenWrapper bg="white">
			<Navbar title="NFT" />
			<View style={styles.container}>{/* Add your token page content here */}</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
	},
});

export default TokenPage;
