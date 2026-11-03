import { db } from '@/db';
import { nameGodTable } from '@/db/schema';
import { changeNameGod, NAME_GOD_INTERVAL } from '@/lib/changeNameGod';
import type { KEvent } from '@/lib/KClient';
import { desc } from 'drizzle-orm';

export default {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`Logged in as ${client.user?.username}!`);

        setInterval(
            async () => {
                const [lastNameGod] = await db
                    .select({ at: nameGodTable.lastNameGodAt })
                    .from(nameGodTable)
                    .orderBy(desc(nameGodTable.lastNameGodAt))
                    .limit(1);

                if (!lastNameGod) return changeNameGod(client);
                const threshold = new Date(lastNameGod.at);
                threshold.setDate(threshold.getDate() + NAME_GOD_INTERVAL);

                const now = new Date();

                if (now > threshold) return changeNameGod(client);
            },
            1000 * 60 * 5,
        );
    },
} as KEvent<'clientReady'>;
