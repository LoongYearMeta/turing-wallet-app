import React from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import { hp } from '@/helpers/common';

interface InputProps extends TextInputProps {
	icon?: React.ReactNode;
	inputRef?: React.RefObject<TextInput>;
	containerStyle?: StyleProp<ViewStyle>;
}

export const Input = (props: InputProps) => {
	return (
		<View style={[styles.container, props.containerStyle && props.containerStyle]}>
			{props.icon && props.icon}
			<TextInput
				style={{ flex: 1 }}
				placeholderTextColor={theme.colors.textLight}
				ref={props.inputRef && props.inputRef}
				{...props}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		height: hp(7.2),
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		paddingHorizontal: 18,
		gap: 12,
	},
});
