import { pgTable, primaryKey, timestamp, varchar } from 'drizzle-orm/pg-core';

export const rolesTable = pgTable(
    'roles',
    {
        roleName: varchar('role_name').notNull(),
        roleId: varchar('role_id').notNull(),
        guildId: varchar('guild_id').notNull(),
        createdAt: timestamp('created_at', { mode: 'date' })
            .defaultNow()
            .notNull(),
        lastUpdatedAt: timestamp('last_updated_at', { mode: 'date' })
            .defaultNow()
            .notNull()
            .$onUpdate(() => new Date()),
    },
    (table) => [primaryKey({ columns: [table.roleId, table.guildId] })],
);
