import crypto from 'crypto';

export const deriveKey = (password: string, salt: string): string => {
	const saltBuffer = Buffer.from(salt, 'hex');
	const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, 'sha256');
	return key.toString('hex');
};

export const generateRandomSalt = (length = 16): string => {
	const salt = crypto.randomBytes(length);
	return salt.toString('hex');
};

export const encrypt = (textToEncrypt: string, password: string): string => {
	const salt = crypto.randomBytes(16);
	const key256Bits = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256');
	const iv = crypto.randomBytes(16);

	const cipher = crypto.createCipheriv('aes-256-cbc', key256Bits, iv);
	let ciphertext = cipher.update(textToEncrypt, 'utf8', 'hex');
	ciphertext += cipher.final('hex');

	const saltedCiphertext = salt.toString('hex') + iv.toString('hex') + ciphertext;
	return saltedCiphertext;
};

export const decrypt = (saltedCiphertext: string, password: string): string => {
	const salt = Buffer.from(saltedCiphertext.slice(0, 32), 'hex');
	const iv = Buffer.from(saltedCiphertext.slice(32, 64), 'hex');
	const ciphertext = saltedCiphertext.slice(64);

	const key256Bits = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256');

	const decipher = crypto.createDecipheriv('aes-256-cbc', key256Bits, iv);
	let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
	decrypted += decipher.final('utf8');

	return decrypted;
};
