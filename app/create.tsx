import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import Icon from '@/assets/icons';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { theme } from '@/constants/theme';
import { hp, wp } from '@/helpers/common';

const Create = () => {
	const nameRef = useRef('');
	const passwordRef = useRef('');
	const confirmPasswordRef = useRef('');
	const [loading, setLoading] = useState(false);

	const router = useRouter();

	const onSubmit = async () => {
		if (!nameRef.current || !passwordRef.current || !confirmPasswordRef.current) {
			Alert.alert('Error', 'Please fill all the fields!');
			return;
		}

		let name = nameRef.current.trim();
		let password = passwordRef.current.trim();
		let confirmPassword = confirmPasswordRef.current.trim();

		if (password !== confirmPassword) {
			Alert.alert('Error', 'Passwords do not match!');
			return;
		}

		setLoading(true);
		const {
			data: { session },
			error,
		} = await supabase.auth.signUp({
			email: email,
			password: password,
			options: {
				data: {
					name,
				},
			},
		});

		// console.log('session: ', session);
		// console.log('error: ', error);

		if (error) Alert.alert('Error', error.message);
		setLoading(false);
	};

	return (
		<ScreenWrapper bg={'white'}>
			<StatusBar style="dark" />
			<View style={styles.container}>
				{/* back button */}
				<View>
					<BackButton router={router} />
				</View>

				{/* welcome */}
				<View>
					<Text style={styles.welcomeText}>Lets's </Text>
					<Text style={styles.welcomeText}>Get Started</Text>
				</View>

				{/* form */}
				<View style={styles.form}>
					<Text style={{ fontSize: hp(1.5), color: theme.colors.text }}>
						Please fill the details to create an account
					</Text>
					<Input
						icon={<Icon name="user" size={26} strokeWidth={1.6} />}
						placeholder="Enter your name"
						placeholderTextColor={theme.colors.textLight}
						onChangeText={(value: string) => (nameRef.current = value)}
					/>
					<Input
						icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
						secureTextEntry
						placeholder="Enter your password"
						placeholderTextColor={theme.colors.textLight}
						onChangeText={(value: string) => (passwordRef.current = value)}
					/>
					<Input
						icon={<Icon name="lock" size={26} strokeWidth={1.6} />}
						secureTextEntry
						placeholder="Confirm your password"
						placeholderTextColor={theme.colors.textLight}
						onChangeText={(value: string) => (confirmPasswordRef.current = value)}
					/>

					{/* button */}
					<Button title="Create account" loading={loading} onPress={onSubmit} />
				</View>

				<View style={styles.footer}>
					<Text style={styles.footerText}>Already have an account!</Text>
					<Pressable onPress={() => router.navigate('/restore')}>
						<Text
							style={[styles.footerText, { color: theme.colors.primaryDark, fontWeight: '600' }]}
						>
							Restore
						</Text>
					</Pressable>
				</View>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		gap: 45,
		paddingHorizontal: wp(5),
	},
	welcomeText: {
		fontSize: hp(4),
		fontWeight: '700',
		color: theme.colors.text,
	},
	form: {
		gap: 25,
	},
	input: {
		flexDirection: 'row',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		padding: 18,
		paddingHorizontal: 20,
		gap: 15,
	},
	forgotPassword: {
		textAlign: 'right',
		fontWeight: '600',
		color: theme.colors.text,
	},
	loginText: {
		fontSize: hp(2.1),
		color: 'white',
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 5,
	},
	footerText: {
		textAlign: 'center',
		color: theme.colors.text,
		fontSize: hp(1.6),
	},
});

export default Create;
