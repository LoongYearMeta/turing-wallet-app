import { store } from '@/utils/store';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getUserData } from '../services/userService';

LogBox.ignoreLogs([
	'Warning: TNodeChildrenRenderer',
	'Warning: MemoizedTNodeRenderer',
	'Warning: TRenderEngineProvider',
]); // Ignore log notification by message

const _layout = () => {
	useEffect(() => {
		// 应用启动时初始化存储
		const initializeStorage = async () => {
			await store.init();
			// 初始化完成后可以进行其他操作
			const currentAccount = store.getCurrentAccount();
			if (currentAccount) {
				// 有账户，可以直接进入主页
				router.replace('/home');
			} else {
				// 没有账户，进入欢迎页
				router.replace('/welcome');
			}
		};

		initializeStorage();
	}, []);

	return (
		<AuthProvider>
			<MainLayout />
		</AuthProvider>
	);
};

const MainLayout = () => {
	const { setAuth, setUserData } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// triggers automatically when auth state changes
		supabase.auth.onAuthStateChange((_event, session) => {
			console.log('session: ', session?.user?.id);
			if (session) {
				setAuth(session?.user);
				updateUserData(session?.user); // update user like image, phone, bio
				router.replace('/home');
			} else {
				setAuth(null);
				router.replace('/welcome');
			}
		});
	}, []);

	const updateUserData = async (user) => {
		let res = await getUserData(user.id);
		if (res.success) setUserData(res.data);
	};

	return (
		<Stack
			screenOptions={{
				headerShown: false,
			}}
		>
			<Stack.Screen
				name="(main)/postDetails"
				options={{
					presentation: 'modal',
				}}
			/>
		</Stack>
	);
};

export default _layout;
