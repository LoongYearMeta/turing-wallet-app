import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams } from 'expo-router';
import { useAccount } from '@/hooks/useAccount';
import { useResponse } from '@/hooks/useResponse';
import { hp } from '@/lib/common';

export default function DAppWebView() {
	const { url, name } = useLocalSearchParams();
	const webViewRef = useRef<WebView>(null);
	const [isConnected, setIsConnected] = useState(false);
	const { getCurrentAccountAddress, getCurrentAccountTbcPubKey, getCurrentAccountBalance } =
		useAccount();
	const { sendTbcResponse } = useResponse();

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

    // 发出准备就绪事件
    window.dispatchEvent(new CustomEvent('TuringReady'));
    true;
  `;

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
					const response = await sendTbcResponse(
						data.params[0].address!,
						data.params[0].tbc_amount!,
						'your_password',
					);
					webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('TuringResponse', {
              detail: { method: 'sendTransaction', result: ${JSON.stringify(response)} }
            }));
          `);
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
});
