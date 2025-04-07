import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { hp, wp } from '@/lib/common';

const appVersion = Constants.expoConfig?.version || '1.0.0';

const STORE_URLS = {
	ios: 'https://apps.apple.com/us/app/turingwallet/id6739019122',
	android: 'https://play.google.com/store/apps/details?id=xyz.turingwallet.app',
};

export default function SystemSettingsPage() {
	const handleCheckUpdate = () => {
		const storeUrl = Platform.select({
			ios: STORE_URLS.ios,
			android: STORE_URLS.android,
			default: STORE_URLS.android,
		});

		Linking.openURL(storeUrl);
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.listContainer}>
					{/* 语言设置 */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>Language</Text>
							<View style={styles.settingValueContainer}>
								<Text style={styles.settingValue}>English</Text>
								<MaterialIcons name="chevron-right" size={24} color="#999" />
							</View>
						</View>
					</TouchableOpacity>

					{/* 应用版本 */}
					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>App Version</Text>
							<Text style={styles.settingValue}>{appVersion}</Text>
						</View>
					</TouchableOpacity>

					{/* 检查更新 */}
					<TouchableOpacity style={styles.settingItem} onPress={handleCheckUpdate}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>Check for Updates</Text>
							<View style={styles.settingValueContainer}>
								<MaterialIcons name="chevron-right" size={24} color="#999" />
							</View>
						</View>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollView: {
		flex: 1,
	},
	listContainer: {
		backgroundColor: '#f5f5f5',
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#f5f5f5',
	},
	settingInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	settingName: {
		fontSize: hp(1.8),
		fontWeight: '500',
		color: '#333',
	},
	settingValueContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	settingValue: {
		fontSize: hp(1.6),
		color: '#666',
		marginRight: wp(1),
	},
});
