import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

export default function PrivacyPolicyPage() {
	const [loading, setLoading] = useState(true);
	const [showFullPolicy, setShowFullPolicy] = useState(false);

	// Simulate loading the policy content
	useEffect(() => {
		const timer = setTimeout(() => {
			setLoading(false);
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	const toggleFullPolicy = () => {
		setShowFullPolicy(!showFullPolicy);
	};

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
			>
				{loading ? (
					<ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
				) : (
					<>
						<Text style={styles.title}>PRIVACY POLICY</Text>

						<Text style={styles.paragraph}>
							This Privacy Policy describes how Turing Wallet collects, uses, and shares your
							personal information when you use our mobile application.
						</Text>

						<Text style={styles.sectionTitle}>Information We Collect</Text>
						<Text style={styles.paragraph}>
							When you use Turing Wallet, we may collect certain information about you, including:
						</Text>
						<Text style={styles.bulletPoint}>• Device information (model, operating system)</Text>
						<Text style={styles.bulletPoint}>• Usage data and analytics</Text>
						<Text style={styles.bulletPoint}>
							• Information you provide when contacting support
						</Text>

						<Text style={styles.sectionTitle}>How We Use Your Information</Text>
						<Text style={styles.paragraph}>We use the information we collect to:</Text>
						<Text style={styles.bulletPoint}>• Provide, maintain, and improve our services</Text>
						<Text style={styles.bulletPoint}>• Respond to your requests and inquiries</Text>
						<Text style={styles.bulletPoint}>• Monitor and analyze usage patterns</Text>
						<Text style={styles.bulletPoint}>
							• Protect against fraudulent or unauthorized activity
						</Text>

						<Text style={styles.sectionTitle}>Data Security</Text>
						<Text style={styles.paragraph}>
							We implement appropriate security measures to protect your personal information.
							However, no method of transmission over the Internet or electronic storage is 100%
							secure.
						</Text>

						<Text style={styles.sectionTitle}>Your Rights</Text>
						<Text style={styles.paragraph}>
							Depending on your location, you may have certain rights regarding your personal
							information, such as the right to access, correct, or delete your data.
						</Text>

						<Text style={styles.sectionTitle}>Changes to This Policy</Text>
						<Text style={styles.paragraph}>
							We may update our Privacy Policy from time to time. We will notify you of any changes
							by posting the new Privacy Policy on this page.
						</Text>

						<TouchableOpacity onPress={toggleFullPolicy} style={styles.linkButton}>
							<Text style={styles.linkText}>
								{showFullPolicy ? 'Show Summary' : 'View Full Privacy Policy'}
							</Text>
							<MaterialIcons
								name={showFullPolicy ? 'expand-less' : 'expand-more'}
								size={16}
								color={theme.colors.primary}
							/>
						</TouchableOpacity>

						{showFullPolicy && (
							<View style={styles.fullPolicyContainer}>
								<Text style={styles.sectionTitle}>Full Privacy Policy</Text>

								<Text style={styles.sectionSubtitle}>1. Introduction</Text>
								<Text style={styles.paragraph}>
									Welcome to Turing Wallet. We respect your privacy and are committed to protecting
									your personal data. This privacy policy will inform you about how we look after
									your personal data when you use our application and tell you about your privacy
									rights and how the law protects you.
								</Text>

								<Text style={styles.sectionSubtitle}>2. The Data We Collect About You</Text>
								<Text style={styles.paragraph}>
									Personal data, or personal information, means any information about an individual
									from which that person can be identified. It does not include data where the
									identity has been removed (anonymous data).
								</Text>
								<Text style={styles.paragraph}>
									We may collect, use, store and transfer different kinds of personal data about you
									which we have grouped together as follows:
								</Text>
								<Text style={styles.bulletPoint}>
									• Identity Data includes username or similar identifier.
								</Text>
								<Text style={styles.bulletPoint}>
									• Technical Data includes internet protocol (IP) address, your login data, browser
									type and version, time zone setting and location, browser plug-in types and
									versions, operating system and platform, and other technology on the devices you
									use to access this application.
								</Text>
								<Text style={styles.bulletPoint}>
									• Usage Data includes information about how you use our application.
								</Text>

								<Text style={styles.sectionSubtitle}>3. How We Use Your Personal Data</Text>
								<Text style={styles.paragraph}>
									We will only use your personal data when the law allows us to. Most commonly, we
									will use your personal data in the following circumstances:
								</Text>
								<Text style={styles.bulletPoint}>
									• Where we need to perform the contract we are about to enter into or have entered
									into with you.
								</Text>
								<Text style={styles.bulletPoint}>
									• Where it is necessary for our legitimate interests (or those of a third party)
									and your interests and fundamental rights do not override those interests.
								</Text>
								<Text style={styles.bulletPoint}>
									• Where we need to comply with a legal obligation.
								</Text>

								<Text style={styles.sectionSubtitle}>4. Data Security</Text>
								<Text style={styles.paragraph}>
									We have put in place appropriate security measures to prevent your personal data
									from being accidentally lost, used or accessed in an unauthorized way, altered or
									disclosed. In addition, we limit access to your personal data to those employees,
									agents, contractors and other third parties who have a business need to know. They
									will only process your personal data on our instructions and they are subject to a
									duty of confidentiality.
								</Text>

								<Text style={styles.sectionSubtitle}>5. Your Legal Rights</Text>
								<Text style={styles.paragraph}>
									Under certain circumstances, you have rights under data protection laws in
									relation to your personal data, including the right to:
								</Text>
								<Text style={styles.bulletPoint}>• Request access to your personal data.</Text>
								<Text style={styles.bulletPoint}>• Request correction of your personal data.</Text>
								<Text style={styles.bulletPoint}>• Request erasure of your personal data.</Text>
								<Text style={styles.bulletPoint}>
									• Object to processing of your personal data.
								</Text>
								<Text style={styles.bulletPoint}>
									• Request restriction of processing your personal data.
								</Text>
								<Text style={styles.bulletPoint}>• Request transfer of your personal data.</Text>
								<Text style={styles.bulletPoint}>• Right to withdraw consent.</Text>

								<Text style={styles.sectionSubtitle}>6. Contact Us</Text>
								<Text style={styles.paragraph}>
									If you have any questions about this privacy policy or our privacy practices,
									please contact us at support@turingwallet.xyz.
								</Text>
							</View>
						)}
					</>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: wp(4),
		paddingBottom: hp(6),
	},
	loader: {
		marginTop: hp(10),
	},
	title: {
		fontSize: hp(2.4),
		fontWeight: 'bold',
		marginBottom: hp(3),
		color: '#333',
		textAlign: 'center',
	},
	sectionTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		marginTop: hp(2.5),
		marginBottom: hp(1.5),
		color: '#333',
	},
	sectionSubtitle: {
		fontSize: hp(1.8),
		fontWeight: '600',
		marginTop: hp(2),
		marginBottom: hp(1),
		color: '#333',
	},
	paragraph: {
		fontSize: hp(1.8),
		lineHeight: hp(2.6),
		color: '#444',
		marginBottom: hp(1.5),
	},
	bulletPoint: {
		fontSize: hp(1.8),
		lineHeight: hp(2.6),
		color: '#444',
		marginLeft: wp(4),
		marginBottom: hp(1),
	},
	linkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: hp(3),
		marginBottom: hp(2),
		padding: hp(1.5),
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	linkText: {
		fontSize: hp(1.8),
		color: theme.colors.primary,
		fontWeight: '500',
		marginRight: wp(1),
	},
	fullPolicyContainer: {
		marginTop: hp(2),
		paddingTop: hp(2),
		borderTopWidth: 1,
		borderTopColor: '#e0e0e0',
	},
});
