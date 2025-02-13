import React from 'react';
import { View } from 'react-native';

import { Loading } from '@/components/ui/loading';

const StartPage = () => {
	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
			<Loading />
		</View>
	);
};

export default StartPage;
