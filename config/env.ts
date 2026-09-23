import dotenv from 'dotenv';
import path from 'path';

// quiet: true -- dotenv v17+ otherwise prints a random unsolicited promo "tip" (dotenvx.com, vestauth.com)
// on every run, including CI logs. Confirmed via dotenv's own source: gated by exactly this option.
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

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
