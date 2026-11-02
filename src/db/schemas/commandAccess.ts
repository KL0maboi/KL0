import { pgEnum, pgTable, primaryKey, varchar } from 'drizzle-orm/pg-core';

export const commandNames = ['ping', 'admin'] as const;
export type CommandName = (typeof commandNames)[number];

export const commandsEnum = pgEnum('commands_enum', commandNames);

export const commandAccessTable = pgTable(
    'command_access',
    {
        userId: varchar('user_id', { length: 32 }).notNull(),
        commandName: commandsEnum('command_name').notNull(),
        username: varchar('username', { length: 64 }),
    },
    (table) => [primaryKey({ columns: [table.userId, table.commandName] })],
);
