import {
    integer,
    pgTable,
    primaryKey,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';

export const commandUsageTable = pgTable(
    'command_usage',
    {
        userId: varchar('user_id', { length: 32 }).notNull(),
        commandName: varchar('command_name', { length: 64 }).notNull(),
        count: integer('count').notNull().default(1),
        firstUsedAt: timestamp('first_used_at', { mode: 'date' })
            .defaultNow()
            .notNull(),
        lastUsedAt: timestamp('last_used_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdate(() => new Date()),
    },
    (table) => [primaryKey({ columns: [table.userId, table.commandName] })],
);

export type CommandUsage = typeof commandUsageTable.$inferSelect;
export type NewCommandUsage = typeof commandUsageTable.$inferInsert;
