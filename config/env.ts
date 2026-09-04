import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const env = {
    baseUrl: required('BASE_URL'),
    apiBaseUrl: required('API_BASE_URL'),
    testUser: {
        email: required('TEST_USER_EMAIL'),
        password: required('TEST_USER_PASSWORD'),
    },
};
