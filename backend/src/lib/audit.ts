import { eq } from 'drizzle-orm';
import { activityLogs, users } from '../db/schema.js';

interface TxLike {
    insert: (...args: any[]) => any;
    query: {
        users: {
            findFirst: (args: any) => Promise<{ id: string; name: string } | undefined>;
        };
    };
}

export async function logActivity(
    tx: TxLike,
    params: {
        userId?: string;
        action: string;
        description: string;
        module: string;
        entityType?: string;
        entityId?: string;
        payload?: unknown;
    },
) {
    const user = params.userId
        ? await tx.query.users.findFirst({
            where: eq(users.id, params.userId),
            columns: { id: true, name: true },
        })
        : undefined;

    await tx.insert(activityLogs).values({
        userId: params.userId,
        userName: user?.name,
        action: params.action,
        description: params.description,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload,
    });
}
