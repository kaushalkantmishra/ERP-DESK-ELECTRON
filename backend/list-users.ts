import { db } from './src/db/drizzle.js';
import { users } from './src/db/schema.js';

async function listUsers() {
    try {
        const allUsers = await db.query.users.findMany();
        console.log('--- USERS IN DATABASE ---');
        allUsers.forEach(u => {
            console.log(`- ${u.name} (${u.email}) [Role: ${u.role}]`);
        });
    } catch (error) {
        console.error('Failed to list users:', error);
    } finally {
        process.exit(0);
    }
}

listUsers();
