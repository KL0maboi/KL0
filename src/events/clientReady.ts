import { db } from '@/db';
import { nameGodTable } from '@/db/schema';
import { changeNameGod, NAME_GOD_INTERVAL } from '@/lib/changeNameGod';
import type { KEvent } from '@/lib/KClient';
import { sql } from 'drizzle-orm';

export default {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user?.username}!`);

        const checkRotation = async () => {
            try {
                // Check if anyone was crowned within the last NAME_GOD_INTERVAL days
                const [recent] = await db
                    .select({ userId: nameGodTable.userId })
                    .from(nameGodTable)
                    .where(
                        sql`${nameGodTable.lastNameGodAt} > NOW() - (${NAME_GOD_INTERVAL} * INTERVAL '1 day')`,
                    )
                    .limit(1);

                // If no recent crown exists (e.g. empty, expired, or all at -infinity), trigger rotation
                if (!recent) {
                    await changeNameGod(client);
                }
            } catch (error) {
                console.error('Error during Name God rotation check:', error);
            }
        };

        // Run check immediately on bot boot
        await checkRotation();

        // Continue periodic check every 5 minutes
        setInterval(checkRotation, 1000 * 60 * 5);
    },
} as KEvent<'clientReady'>;
