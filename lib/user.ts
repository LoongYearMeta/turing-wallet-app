import { database } from '@/utils/sqlite';

export async function addUser(address: string): Promise<void> {
	try {
		await database.addUser(address);
	} catch (error) {
		throw new Error('Failed to add user');
	}
}

export async function deleteUserData(address: string): Promise<void> {
	try {
		await database.deleteUserData(address);
	} catch (error) {
		throw new Error('Failed to delete user data');
	}
}
