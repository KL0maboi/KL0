import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const nameGodTable = pgTable('name_god', {
    userId: varchar('user_id', { length: 32 }).notNull().primaryKey(),
    count: integer('count').notNull().default(0),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    lastNameGodAt: timestamp('last_name_god_at', { mode: 'date' })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
});
