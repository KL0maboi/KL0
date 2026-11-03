import { pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';

export const channelsTable = pgTable(
    'channels',
    {
        channel: varchar('channel').notNull(),
        channelId: varchar('channel_id').notNull(),
        guildId: varchar('guild_id').notNull(),
        createdAt: timestamp('created_at', { mode: 'date' })
            .defaultNow()
            .notNull(),
        lastUpdatedAt: timestamp('last_updated_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdate(() => new Date()),
    },
    (table) => [primaryKey({ columns: [table.channelId, table.guildId] })],
);
