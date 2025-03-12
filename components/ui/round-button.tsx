import { MaterialIcons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface RoundButtonProps {
	icon: keyof typeof MaterialIcons.glyphMap;
	label: string;
	onPress?: () => void;
}

export const RoundButton = forwardRef<View, RoundButtonProps>(({ icon, label, onPress }, ref) => {
	return (
		<Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
			<View ref={ref} style={styles.container}>
				<View style={styles.iconContainer}>
					<MaterialIcons name={icon} size={18} color="white" />
				</View>
				<Text style={styles.label}>{label}</Text>
			</View>
		</Pressable>
	);
});

RoundButton.displayName = 'RoundButton';

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
	},
	iconContainer: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#000',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 4,
	},
	label: {
		fontSize: 11,
		color: '#000',
	},
	pressed: {
		opacity: 0.7,
	},
});
