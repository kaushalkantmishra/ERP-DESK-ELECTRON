import { eq } from 'drizzle-orm';
import { activityLogs, users } from './db/schema.js';

type AnyTx = any;

export async function logActivity(
    tx: AnyTx,
    params: {
        userId?: string;
        action: string;
        description: string;
        module: string;
        entityType?: string;
        entityId?: string;
        payload?: unknown;
        beforeData?: unknown;
        afterData?: unknown;
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
        beforeData: params.beforeData,
        afterData: params.afterData,
        payload: params.payload,
    });
}
