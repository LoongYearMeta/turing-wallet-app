import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 1200;
const AUTO_NAVIGATE_DELAY = 3000;
const TEXT_ANIMATION_DELAY = 300;

const WelcomePage = () => {
	const router = useRouter();
	const navigation = useNavigation();
	const imageOpacity = new Animated.Value(0);
	const imageScale = new Animated.Value(0.9);
	const textOpacity = new Animated.Value(0);
	const textTranslateY = new Animated.Value(15);

	const { getCurrentAccountAddress } = useAccount();

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: false,
		});
	}, [navigation]);

	useEffect(() => {
		Animated.parallel([
			Animated.timing(imageOpacity, {
				toValue: 1,
				duration: ANIMATION_DURATION,
				easing: Easing.bezier(0.25, 0.1, 0.25, 1),
				useNativeDriver: true,
			}),
			Animated.timing(imageScale, {
				toValue: 1,
				duration: ANIMATION_DURATION,
				easing: Easing.bezier(0.25, 0.1, 0.25, 1),
				useNativeDriver: true,
			}),
		]).start();

		setTimeout(() => {
			Animated.stagger(200, [
				Animated.timing(textOpacity, {
					toValue: 1,
					duration: ANIMATION_DURATION,
					easing: Easing.bezier(0.25, 0.1, 0.25, 1),
					useNativeDriver: true,
				}),
				Animated.timing(textTranslateY, {
					toValue: 0,
					duration: ANIMATION_DURATION,
					easing: Easing.bezier(0, 0, 0.2, 1),
					useNativeDriver: true,
				}),
			]).start();
		}, TEXT_ANIMATION_DELAY);

		const timer = setTimeout(() => {
			const address = getCurrentAccountAddress();
			if (address) {
				router.replace('/(tabs)/home');
			} else {
				router.replace('/login');
			}
		}, AUTO_NAVIGATE_DELAY);

		return () => clearTimeout(timer);
	}, []);

	return (
		<ScreenWrapper bg={'white'}>
			<View style={styles.container}>
				<View style={styles.contentContainer}>
					<Animated.View
						style={[
							styles.imageContainer,
							{
								opacity: imageOpacity,
								transform: [{ scale: imageScale }],
							},
						]}
					>
						<Image
							source={require('@/assets/images/welcome.png')}
							style={styles.image}
							contentFit="contain"
						/>
					</Animated.View>

					<Animated.View
						style={[
							styles.textContainer,
							{
								opacity: textOpacity,
								transform: [{ translateY: textTranslateY }],
							},
						]}
					>
						<Animated.Text style={styles.title}>Welcome!</Animated.Text>
						<Animated.Text style={styles.punchline}>
							Experience digital asset management with security and simplicity.
						</Animated.Text>
					</Animated.View>
				</View>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
		paddingHorizontal: wp(5),
	},
	contentContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingBottom: hp(8),
	},
	imageContainer: {
		width: width * 0.8,
		aspectRatio: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: -hp(5),
	},
	image: {
		width: '100%',
		height: '100%',
	},
	textContainer: {
		gap: 15,
		marginTop: hp(8),
		alignItems: 'center',
	},
	title: {
		color: theme.colors.text,
		fontSize: hp(4),
		textAlign: 'center',
		fontWeight: '800',
	},
	punchline: {
		textAlign: 'center',
		paddingHorizontal: wp(10),
		fontSize: hp(1.7),
		color: theme.colors.text,
	},
});

export default WelcomePage;
