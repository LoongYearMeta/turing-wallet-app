import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

const appVersion = Constants.expoConfig?.version || '1.0.0';

// App store URLs for iOS and Android
const APP_STORE_URL = 'https://apps.apple.com/app/your-app-id'; // 替换为实际的App Store链接
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.anonymous.turingwallet'; // 替换为实际的Play Store链接

export default function SystemSettingsPage() {
	const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

	// 打开应用商店页面
	const openAppStore = () => {
		const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
		Linking.canOpenURL(storeUrl).then((supported) => {
			if (supported) {
				Linking.openURL(storeUrl);
			} else {
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: 'Cannot open app store link',
					visibilityTime: 3000,
				});
			}
		});
	};

	// 模拟检查更新
	const checkForUpdates = () => {
		setIsCheckingForUpdates(true);

		// 模拟网络请求延迟
		setTimeout(() => {
			setIsCheckingForUpdates(false);
			// 这里应该连接到服务器检查实际更新
			// 现在只是打开应用商店链接

			Toast.show({
				type: 'info',
				text1: 'Information',
				text2: 'Redirecting to app store for the latest version',
				visibilityTime: 3000,
			});

			openAppStore();
		}, 1500);
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
					<TouchableOpacity
						style={styles.settingItem}
						onPress={checkForUpdates}
						disabled={isCheckingForUpdates}
					>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>Check for Updates</Text>
							<View style={styles.settingValueContainer}>
								{isCheckingForUpdates ? (
									<ActivityIndicator size="small" color={theme.colors.primary} />
								) : (
									<MaterialIcons name="system-update" size={24} color={theme.colors.primary} />
								)}
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
		backgroundColor: '#ffffff',
		marginTop: hp(1),
		borderRadius: 8,
		marginHorizontal: wp(4),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
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
