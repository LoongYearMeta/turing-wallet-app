import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal as RNModal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { wp } from '@/helpers/common';

interface ModalProps {
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

export const Modal = ({ visible, onClose, children }: ModalProps) => {
	return (
		<RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
				<View style={styles.content} onStartShouldSetResponder={() => true}>
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<MaterialIcons name="close" size={24} color="#666" />
					</TouchableOpacity>
					{children}
				</View>
			</TouchableOpacity>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: wp(5),
		width: wp(80),
		maxWidth: 400,
		position: 'relative',
	},
	closeButton: {
		position: 'absolute',
		right: wp(2),
		top: wp(2),
		padding: wp(1),
		zIndex: 1,
	},
});
