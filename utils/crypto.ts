import CryptoJS from 'crypto-js';

export const generateRandomSalt = (length = 16): string => {
	const timestamp = new Date().getTime().toString();
	const randomPart = Math.random().toString().substring(2);
	const extraEntropy = (Math.random() * 1000000).toString();
	const combinedString = timestamp + randomPart + extraEntropy;
	const hash = CryptoJS.SHA256(combinedString);
	return hash.toString(CryptoJS.enc.Hex).substring(0, length * 2);
};

export const deriveKey = (password: string, salt: string): string => {
	const key = CryptoJS.PBKDF2(password, salt, {
		keySize: 256 / 32,
		iterations: 1000,
	});

	return key.toString(CryptoJS.enc.Hex);
};

export const encrypt = (textToEncrypt: string, key: string): string => {
	const iv = generateRandomSalt(8);

	const encrypted = CryptoJS.AES.encrypt(textToEncrypt, CryptoJS.enc.Hex.parse(key), {
		iv: CryptoJS.enc.Hex.parse(iv),
		padding: CryptoJS.pad.Pkcs7,
		mode: CryptoJS.mode.CBC,
	});

	return iv + encrypted.toString();
};

export const decrypt = (ciphertext: string, password: string, salt: string): string => {
	const key = deriveKey(password, salt);
	const iv = ciphertext.substring(0, 16);
	const actualCiphertext = ciphertext.substring(16);

	const decrypted = CryptoJS.AES.decrypt(actualCiphertext, CryptoJS.enc.Hex.parse(key), {
		iv: CryptoJS.enc.Hex.parse(iv),
		padding: CryptoJS.pad.Pkcs7,
		mode: CryptoJS.mode.CBC,
	});

	return decrypted.toString(CryptoJS.enc.Utf8);
};
