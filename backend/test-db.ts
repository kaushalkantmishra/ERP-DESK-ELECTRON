import { db } from './src/db/drizzle.js';
import { users } from './src/db/schema.js';

async function testConnection() {
    try {
        console.log('Testing database connection...');
        const result = await db.query.users.findMany({ limit: 1 });
        console.log('Connection successful! Found users:', result.length);
    } catch (error) {
        console.error('Database connection failed:', error);
    } finally {
        process.exit(0);
    }
}

testConnection();
