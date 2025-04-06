import { useAccount } from '@/hooks/useAccount';
import type { SendTransactionRequest, SendTransactionResponse } from '@/hooks/useResponse';
import { useResponse } from '@/hooks/useResponse';
import { hp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';

export default function DAppWebView() {
	const { url, name } = useLocalSearchParams();
	const webViewRef = useRef<WebView>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [showTransactionForm, setShowTransactionForm] = useState(false);
	const [currentRequest, setCurrentRequest] = useState<SendTransactionRequest[]>([]);
	const [password, setPassword] = useState('');
	const [processing, setProcessing] = useState(false);

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

	const validatePassword = () => {
		const encryptedPass = getPassKey();
		const salt = getSalt();

		if (!encryptedPass || !salt) {
			return false;
		}

		return verifyPassword(password, encryptedPass, salt);
	};

	const processTransaction = async () => {
		if (!validatePassword()) {
			Toast.show({
				type: 'error',
				text1: 'Invalid password',
			});
			return { error: 'invalid-password' };
		}

		setProcessing(true);
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
		} finally {
			setProcessing(false);
		}
	};

	const handleSubmitTransaction = async () => {
		const result = await processTransaction();

		setShowTransactionForm(false);
		setCurrentRequest([]);
		setPassword('');

		webViewRef.current?.injectJavaScript(`
			window.dispatchEvent(new CustomEvent('TuringResponse', {
				detail: { method: 'sendTransaction', result: ${JSON.stringify(result)} }
			}));
		`);
	};

	const handleCancelTransaction = () => {
		setShowTransactionForm(false);
		setCurrentRequest([]);
		setPassword('');

		webViewRef.current?.injectJavaScript(`
			window.dispatchEvent(new CustomEvent('TuringResponse', {
				detail: { method: 'sendTransaction', result: { error: 'user-cancelled' } }
			}));
		`);
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
					// Instead of processing immediately, show the transaction form
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
			{showTransactionForm ? (
				<ScrollView style={styles.formContainer}>
					<View style={styles.formHeader}>
						<Text style={styles.formTitle}>Transaction Request</Text>
						<Text style={styles.formSubtitle}>Type: {currentRequest[0]?.flag}</Text>
					</View>

					<View style={styles.paramsContainer}>
						{Object.entries(currentRequest[0] || {}).map(([key, value]) =>
							key !== 'flag' ? renderParameter(key, value) : null,
						)}
					</View>

					<View style={styles.passwordContainer}>
						<Text style={styles.passwordLabel}>Enter your password to confirm:</Text>
						<TextInput
							style={styles.passwordInput}
							value={password}
							onChangeText={setPassword}
							secureTextEntry
							placeholder="Password"
						/>
					</View>

					<View style={styles.buttonContainer}>
						<TouchableOpacity
							style={[styles.button, styles.cancelButton]}
							onPress={handleCancelTransaction}
							disabled={processing}
						>
							<Text style={styles.buttonText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, styles.confirmButton]}
							onPress={handleSubmitTransaction}
							disabled={processing || !password}
						>
							<Text style={styles.buttonText}>{processing ? 'Processing...' : 'Confirm'}</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			) : (
				<>
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
				</>
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
	formContainer: {
		flex: 1,
		padding: 16,
	},
	formHeader: {
		marginBottom: 24,
	},
	formTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	formSubtitle: {
		fontSize: 16,
		color: '#666',
	},
	paramsContainer: {
		marginBottom: 24,
		backgroundColor: '#f5f5f5',
		padding: 16,
		borderRadius: 8,
	},
	paramRow: {
		flexDirection: 'row',
		marginBottom: 8,
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	paramLabel: {
		flex: 1,
		fontWeight: 'bold',
	},
	paramValue: {
		flex: 2,
	},
	passwordContainer: {
		marginBottom: 24,
	},
	passwordLabel: {
		marginBottom: 8,
		fontSize: 16,
	},
	passwordInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 4,
		padding: 12,
		fontSize: 16,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	button: {
		padding: 16,
		borderRadius: 4,
		flex: 1,
		alignItems: 'center',
		marginHorizontal: 8,
	},
	cancelButton: {
		backgroundColor: '#ccc',
	},
	confirmButton: {
		backgroundColor: '#000',
	},
	buttonText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
