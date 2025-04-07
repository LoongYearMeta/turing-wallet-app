import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import { debounce } from 'lodash';
import { MaterialIcons } from '@expo/vector-icons';

import { useAccount } from '@/hooks/useAccount';
import type { SendTransactionRequest, SendTransactionResponse } from '@/hooks/useResponse';
import { useResponse } from '@/hooks/useResponse';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';

export default function DAppWebView() {
	const { url, name } = useLocalSearchParams();
	const webViewRef = useRef<WebView>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [showTransactionForm, setShowTransactionForm] = useState(false);
	const [currentRequest, setCurrentRequest] = useState<SendTransactionRequest[]>([]);
	const [password, setPassword] = useState('');
	const [formErrors, setFormErrors] = useState<{ password?: string; isValid?: boolean }>({});

	const {
		getCurrentAccountAddress,
		getCurrentAccountTbcPubKey,
		getCurrentAccountBalance,
		getPassKey,
		getSalt,
	} = useAccount();

	const {
		sendTbcResponse,
		createCollectionResponse,
		createNFTResponse,
		transferNFTResponse,
		mintFTResponse,
		transferFTResponse,
		mintPoolNFTResponse,
		initPoolNFTResponse,
		increaseLPResponse,
		consumeLPResponse,
		swapToTokenResponse,
		swapToTbcResponse,
		poolNFTMergeResponse,
		mergeFTLPResponse,
	} = useResponse();

	const injectedJavaScript = `
    window.Turing = {
      isReady: true,
      
      async connect() {
        return new Promise((resolve) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            method: 'connect'
          }));
          
          window.addEventListener('TuringResponse', function handleResponse(event) {
            if (event.detail.method === 'connect') {
              window.removeEventListener('TuringResponse', handleResponse);
              resolve(event.detail.result);
            }
          });
        });
      },

      async disconnect() {
        return new Promise((resolve) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            method: 'disconnect'
          }));
          
          window.addEventListener('TuringResponse', function handleResponse(event) {
            if (event.detail.method === 'disconnect') {
              window.removeEventListener('TuringResponse', handleResponse);
              resolve(event.detail.result);
            }
          });
        });
      },

      async getPubKey() {
        return new Promise((resolve) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            method: 'getPubKey'
          }));
          
          window.addEventListener('TuringResponse', function handleResponse(event) {
            if (event.detail.method === 'getPubKey') {
              window.removeEventListener('TuringResponse', handleResponse);
              resolve(event.detail.result);
            }
          });
        });
      },

      async getAddress() {
        return new Promise((resolve) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            method: 'getAddress'
          }));
          
          window.addEventListener('TuringResponse', function handleResponse(event) {
            if (event.detail.method === 'getAddress') {
              window.removeEventListener('TuringResponse', handleResponse);
              resolve(event.detail.result);
            }
          });
        });
      },

      async getBalance() {
        return new Promise((resolve) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            method: 'getBalance'
          }));
          
          window.addEventListener('TuringResponse', function handleResponse(event) {
            if (event.detail.method === 'getBalance') {
              window.removeEventListener('TuringResponse', handleResponse);
              resolve(event.detail.result);
            }
          });
        });
      },

      async sendTransaction(params) {
        return new Promise((resolve) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            method: 'sendTransaction',
            params
          }));
          
          window.addEventListener('TuringResponse', function handleResponse(event) {
            if (event.detail.method === 'sendTransaction') {
              window.removeEventListener('TuringResponse', handleResponse);
              resolve(event.detail.result);
            }
          });
        });
      }
    };

    window.dispatchEvent(new CustomEvent('TuringReady'));
    true;
  `;

	const debouncedPasswordValidation = useCallback(
		debounce(async (password: string) => {
			if (!password) {
				setFormErrors({ password: 'Password is required', isValid: false });
				return;
			}

			const encryptedPass = getPassKey();
			const salt = getSalt();

			if (!encryptedPass || !salt) {
				setFormErrors({
					password: 'Account error, please try again',
					isValid: false,
				});
				return;
			}

			try {
				const isValid = verifyPassword(password, encryptedPass, salt);
				if (isValid) {
					setFormErrors({ isValid: true });
				} else {
					setFormErrors({
						password: 'Incorrect password',
						isValid: false,
					});
				}
			} catch (error) {
				console.error('Password validation error:', error);
				setFormErrors({
					password: 'Incorrect password',
					isValid: false,
				});
			}
		}, 1000),
		[getPassKey, getSalt],
	);

	const handlePasswordChange = (value: string) => {
		value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		setFormErrors({ isValid: false });
		setPassword(value);
		debouncedPasswordValidation(value);
	};

	const processTransaction = async () => {
		if (!password) {
			Toast.show({
				type: 'error',
				text1: 'Invalid password',
			});
			return { error: 'invalid-password' };
		}

		try {
			if (!currentRequest || currentRequest.length === 0) {
				throw new Error('No transaction request found');
			}

			const request = currentRequest[0];
			let response: SendTransactionResponse = { error: 'unknown-request-type' };

			switch (request.flag) {
				case 'P2PKH':
					if (!request.address || !request.satoshis) {
						throw new Error('Missing required parameters');
					}
					response = await sendTbcResponse(request.address, request.satoshis / 1e6, password);
					break;

				case 'COLLECTION_CREATE':
					if (!request.collection_data) {
						throw new Error('Missing collection data');
					}
					const collectionData = JSON.parse(request.collection_data);
					response = await createCollectionResponse(collectionData, password);
					break;

				case 'NFT_CREATE':
					if (!request.collection_id || !request.nft_data) {
						throw new Error('Missing required parameters');
					}
					const nftData = JSON.parse(request.nft_data);
					response = await createNFTResponse(request.collection_id, nftData, password);
					break;

				case 'NFT_TRANSFER':
					if (!request.nft_contract_address || !request.address) {
						throw new Error('Missing required parameters');
					}
					// Transfer times defaults to 1 if not specified
					const transferTimes = request.merge_times || 1;
					response = await transferNFTResponse(
						request.nft_contract_address,
						request.address,
						transferTimes,
						password,
					);
					break;

				case 'FT_MINT':
					if (!request.ft_data) {
						throw new Error('Missing FT data');
					}
					const ftData = JSON.parse(request.ft_data);
					response = await mintFTResponse(ftData, password);
					break;

				case 'FT_TRANSFER':
					if (!request.ft_contract_address || !request.address || !request.ft_amount) {
						throw new Error('Missing required parameters');
					}
					response = await transferFTResponse(
						request.ft_contract_address,
						request.address,
						Number(request.ft_amount),
						password,
					);
					break;

				case 'POOLNFT_MINT':
					if (!request.ft_contract_address) {
						throw new Error('Missing required parameters');
					}
					const withLock = !!request.with_lock;
					const poolNftVersion = request.poolNFT_version || 1;
					const serviceFeeRate = request.serviceFeeRate || 0;
					const serverProviderTag = request.serverProvider_tag || '';

					response = await mintPoolNFTResponse(
						request.ft_contract_address,
						withLock,
						poolNftVersion,
						serviceFeeRate,
						serverProviderTag,
						password,
					);
					break;

				case 'POOLNFT_INIT':
					if (
						!request.nft_contract_address ||
						!request.address ||
						!request.tbc_amount ||
						!request.ft_amount
					) {
						throw new Error('Missing required parameters');
					}
					const poolNftInitVersion = request.poolNFT_version || 1;

					response = await initPoolNFTResponse(
						request.nft_contract_address,
						request.address,
						Number(request.tbc_amount),
						Number(request.ft_amount),
						poolNftInitVersion,
						password,
					);
					break;

				case 'POOLNFT_LP_INCREASE':
					if (!request.nft_contract_address || !request.address || !request.tbc_amount) {
						throw new Error('Missing required parameters');
					}
					const poolNftLPVersion = request.poolNFT_version || 1;

					response = await increaseLPResponse(
						request.nft_contract_address,
						request.address,
						Number(request.tbc_amount),
						poolNftLPVersion,
						password,
					);
					break;

				case 'POOLNFT_LP_CONSUME':
					if (!request.nft_contract_address || !request.address || !request.ft_amount) {
						throw new Error('Missing required parameters');
					}
					const poolNftConsumeVersion = request.poolNFT_version || 1;

					response = await consumeLPResponse(
						request.nft_contract_address,
						request.address,
						Number(request.ft_amount),
						poolNftConsumeVersion,
						password,
					);
					break;

				case 'POOLNFT_SWAP_TO_TOKEN':
					if (!request.nft_contract_address || !request.address || !request.tbc_amount) {
						throw new Error('Missing required parameters');
					}
					const poolNftSwapTokenVersion = request.poolNFT_version || 1;

					response = await swapToTokenResponse(
						request.nft_contract_address,
						request.address,
						Number(request.tbc_amount),
						poolNftSwapTokenVersion,
						password,
					);
					break;

				case 'POOLNFT_SWAP_TO_TBC':
					if (!request.nft_contract_address || !request.address || !request.ft_amount) {
						throw new Error('Missing required parameters');
					}
					const poolNftSwapTbcVersion = request.poolNFT_version || 1;

					response = await swapToTbcResponse(
						request.nft_contract_address,
						request.address,
						Number(request.ft_amount),
						poolNftSwapTbcVersion,
						password,
					);
					break;

				case 'POOLNFT_MERGE':
					if (!request.nft_contract_address || !request.merge_times) {
						throw new Error('Missing required parameters');
					}
					const poolNftMergeVersion = request.poolNFT_version || 1;

					response = await poolNFTMergeResponse(
						request.nft_contract_address,
						Number(request.merge_times),
						poolNftMergeVersion,
						password,
					);
					break;

				case 'FTLP_MERGE':
					if (!request.nft_contract_address) {
						throw new Error('Missing required parameters');
					}
					const ftlpMergeVersion = request.poolNFT_version || 1;

					response = await mergeFTLPResponse(
						request.nft_contract_address,
						ftlpMergeVersion,
						password,
					);
					break;

				default:
					throw new Error('Unknown transaction type');
			}

			return response;
		} catch (error: any) {
			console.error('Transaction error:', error);
			return { error: error.message || 'unknown-error' };
		}
	};

	const handleSubmitTransaction = async () => {
		if (formErrors.password || !password) {
			return;
		}

		try {
			const response = await processTransaction();
			webViewRef.current?.injectJavaScript(`
				window.dispatchEvent(new CustomEvent('TuringResponse', {
					detail: { 
						method: 'sendTransaction', 
						result: ${JSON.stringify(response)}
					}
				}));
			`);
		} catch (error: any) {
			webViewRef.current?.injectJavaScript(`
				window.dispatchEvent(new CustomEvent('TuringResponse', {
					detail: { 
						method: 'sendTransaction', 
						result: { error: '${error.message}' }
					}
				}));
			`);
		} finally {
			setPassword('');
			setCurrentRequest([]);
			setShowTransactionForm(false);
		}
	};

	const handleCancelTransaction = () => {
		webViewRef.current?.injectJavaScript(`
			window.dispatchEvent(new CustomEvent('TuringResponse', {
				detail: { 
					method: 'sendTransaction', 
					result: { error: 'User cancelled the transaction' }
				}
			}));
		`);
		setShowTransactionForm(false);
		setPassword('');
		setCurrentRequest([]);
	};

	const renderParameter = (key: string, value: any) => {
		if (value === undefined || value === null) return null;

		let displayValue = value;
		if (typeof value === 'object') {
			displayValue = JSON.stringify(value);
		} else if (typeof value === 'boolean') {
			displayValue = value ? 'Yes' : 'No';
		}

		return (
			<View style={styles.paramRow} key={key}>
				<Text style={styles.paramLabel}>{key}:</Text>
				<Text style={styles.paramValue}>{displayValue}</Text>
			</View>
		);
	};

	const handleMessage = async (event: any) => {
		try {
			const data = JSON.parse(event.nativeEvent.data);

			switch (data.method) {
				case 'connect':
					if (!isConnected) {
						const pubKey = getCurrentAccountTbcPubKey();
						setIsConnected(true);
						webViewRef.current?.injectJavaScript(`
							window.dispatchEvent(new CustomEvent('TuringResponse', {
								detail: { method: 'connect', result: '${pubKey}' }
							}));
						`);
					}
					break;

				case 'disconnect':
					setIsConnected(false);
					webViewRef.current?.injectJavaScript(`
						window.dispatchEvent(new CustomEvent('TuringResponse', {
							detail: { method: 'disconnect', result: true }
						}));
					`);
					break;

				case 'getPubKey':
					const pubKey = getCurrentAccountTbcPubKey();
					webViewRef.current?.injectJavaScript(`
						window.dispatchEvent(new CustomEvent('TuringResponse', {
							detail: { method: 'getPubKey', result: { tbcPubKey: '${pubKey}' } }
						}));
					`);
					break;

				case 'getAddress':
					const currentAddress = getCurrentAccountAddress();
					webViewRef.current?.injectJavaScript(`
						window.dispatchEvent(new CustomEvent('TuringResponse', {
							detail: { method: 'getAddress', result: { tbcAddress: '${currentAddress}' } }
						}));
					`);
					break;

				case 'getBalance':
					const balance = getCurrentAccountBalance();
					webViewRef.current?.injectJavaScript(`
						window.dispatchEvent(new CustomEvent('TuringResponse', {
							detail: { method: 'getBalance', result: { tbc: ${balance?.tbc || 0} } }
						}));
					`);
					break;

				case 'sendTransaction':
					setCurrentRequest(data.params);
					setShowTransactionForm(true);
					break;
			}
		} catch (error) {
			console.error('Error handling message:', error);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>{name}</Text>
			</View>
			<WebView
				ref={webViewRef}
				source={{ uri: url as string }}
				injectedJavaScript={injectedJavaScript}
				onMessage={handleMessage}
				style={styles.webview}
			/>
			{showTransactionForm && (
				<View style={styles.modalOverlay}>
					<View style={styles.formContainer}>
						<View style={styles.formHeader}>
							<Text style={styles.formTitle}>Transaction Request</Text>
							<Text style={styles.formSubtitle}>Type: {currentRequest[0]?.flag}</Text>
						</View>

						<ScrollView style={styles.paramsContainer}>
							{Object.entries(currentRequest[0] || {}).map(([key, value]) =>
								key !== 'flag' ? renderParameter(key, value) : null,
							)}
						</ScrollView>

						<View style={styles.passwordContainer}>
							<Text style={styles.passwordLabel}>Enter your password to confirm:</Text>
							<View style={styles.inputWrapper}>
								<TextInput
									style={[styles.passwordInput, formErrors.password && styles.inputError]}
									value={password}
									onChangeText={handlePasswordChange}
									secureTextEntry
									placeholder="Password"
									placeholderTextColor="#999"
								/>
								{password.length > 0 && (
									<TouchableOpacity
										style={styles.clearButton}
										onPress={() => {
											setPassword('');
											setFormErrors({});
										}}
									>
										<MaterialIcons name="close" size={20} color="#999" />
									</TouchableOpacity>
								)}
							</View>
							{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
						</View>

						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={[styles.button, styles.cancelButton]}
								onPress={handleCancelTransaction}
							>
								<Text style={styles.buttonText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.button,
									formErrors.isValid ? styles.confirmButton : styles.disabledButton,
								]}
								onPress={handleSubmitTransaction}
								disabled={!formErrors.isValid}
							>
								<Text
									style={[
										styles.buttonText,
										formErrors.isValid ? styles.confirmButtonText : styles.disabledButtonText,
									]}
								>
									Confirm
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		height: hp(6),
		justifyContent: 'center',
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		backgroundColor: '#fff',
	},
	title: {
		fontSize: hp(2),
		fontWeight: '500',
		color: '#000',
	},
	webview: {
		flex: 1,
	},
	modalOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: '50%',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	formContainer: {
		flex: 1,
		backgroundColor: '#1a1a1a',
		padding: wp(4),
		borderTopLeftRadius: wp(4),
		borderTopRightRadius: wp(4),
	},
	formHeader: {
		marginBottom: hp(2),
	},
	formTitle: {
		fontSize: hp(2.4),
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: hp(1),
	},
	formSubtitle: {
		fontSize: hp(1.8),
		color: '#999',
	},
	paramsContainer: {
		flex: 1,
		backgroundColor: '#1a1a1a',
		borderRadius: wp(2),
		padding: wp(3),
		marginBottom: hp(2),
	},
	paramRow: {
		flexDirection: 'row',
		marginBottom: hp(1),
		paddingBottom: hp(1),
		borderBottomWidth: 1,
		borderBottomColor: '#333',
	},
	paramLabel: {
		flex: 1,
		color: '#999',
		fontWeight: '500',
	},
	paramValue: {
		flex: 2,
		color: '#fff',
	},
	passwordContainer: {
		marginBottom: hp(2),
	},
	passwordLabel: {
		marginBottom: hp(1),
		fontSize: hp(1.6),
		color: '#fff',
	},
	inputWrapper: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
	},
	passwordInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#333',
		borderRadius: wp(1),
		padding: wp(3),
		paddingRight: wp(10),
		fontSize: hp(1.6),
		color: '#fff',
		backgroundColor: '#1a1a1a',
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		padding: wp(1),
		justifyContent: 'center',
		alignItems: 'center',
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: wp(3),
	},
	button: {
		flex: 1,
		padding: wp(4),
		borderRadius: wp(2),
		alignItems: 'center',
	},
	cancelButton: {
		backgroundColor: '#333',
	},
	confirmButton: {
		backgroundColor: '#fff',
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: hp(1.8),
	},
	disabledButton: {
		backgroundColor: '#333',
		opacity: 0.7,
	},
	disabledButtonText: {
		opacity: 0.7,
	},
	confirmButtonText: {
		color: '#000',
	},
	inputError: {
		borderColor: '#ff4444',
	},
	errorText: {
		color: '#ff4444',
		fontSize: hp(1.4),
		marginTop: hp(0.5),
		marginLeft: wp(1),
	},
});
