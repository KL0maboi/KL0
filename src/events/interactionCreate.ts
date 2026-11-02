import { MessageFlags, type InteractionReplyOptions } from 'discord.js';
import type { KEvent } from '@/lib/KClient';
import { KCommandCooldownLevels } from '@/lib/KClient';
import { db } from '@/db';
import {
    commandAccessTable,
    commandNames,
    commandUsageTable,
    type CommandName,
} from '@/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

export default {
    name: 'interactionCreate',
    async execute(client, interaction) {
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try {
                    await command.autocomplete(client, interaction);
                } catch (error) {
                    console.error(
                        `Autocomplete error on ${interaction.commandName}:`,
                        error,
                    );
                }
            }
            return;
        }

        if (
            interaction.isContextMenuCommand() ||
            interaction.isChatInputCommand()
        ) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                await interaction.reply({
                    content: 'Command not found',
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }

            // 1. Command access restriction check
            if (command.restricted) {
                try {
                    const isKnownCommand = (
                        commandNames as readonly string[]
                    ).includes(interaction.commandName);

                    let hasAccess = false;
                    if (isKnownCommand) {
                        const [access] = await db
                            .select()
                            .from(commandAccessTable)
                            .where(
                                and(
                                    eq(
                                        commandAccessTable.userId,
                                        interaction.user.id,
                                    ),
                                    eq(
                                        commandAccessTable.commandName,
                                        interaction.commandName as CommandName,
                                    ),
                                ),
                            )
                            .limit(1);

                        hasAccess = Boolean(access);
                    }

                    if (!hasAccess) {
                        await interaction.reply({
                            content:
                                'You do not have permission to use this command.',
                            flags: MessageFlags.Ephemeral,
                        });
                        return;
                    }
                } catch (error) {
                    console.error(
                        `Failed to verify command access for ${interaction.commandName}:`,
                        error,
                    );
                    await interaction.reply({
                        content:
                            'An error occurred while verifying command access permissions.',
                        flags: MessageFlags.Ephemeral,
                    });
                    return;
                }
            }

            // 2. Cooldown verification via DB
            if (
                command.cooldownMs &&
                command.cooldownLevel &&
                command.cooldownLevel !== KCommandCooldownLevels.None
            ) {
                try {
                    let lastRunDate: Date | null = null;

                    if (
                        command.cooldownLevel === KCommandCooldownLevels.Server
                    ) {
                        const [latestUsage] = await db
                            .select({
                                lastUsedAt: commandUsageTable.lastUsedAt,
                            })
                            .from(commandUsageTable)
                            .where(
                                eq(
                                    commandUsageTable.commandName,
                                    interaction.commandName,
                                ),
                            )
                            .orderBy(desc(commandUsageTable.lastUsedAt))
                            .limit(1);

                        lastRunDate = latestUsage?.lastUsedAt ?? null;
                    } else {
                        const [userUsage] = await db
                            .select({
                                lastUsedAt: commandUsageTable.lastUsedAt,
                            })
                            .from(commandUsageTable)
                            .where(
                                and(
                                    eq(
                                        commandUsageTable.userId,
                                        interaction.user.id,
                                    ),
                                    eq(
                                        commandUsageTable.commandName,
                                        interaction.commandName,
                                    ),
                                ),
                            )
                            .limit(1);

                        lastRunDate = userUsage?.lastUsedAt ?? null;
                    }

                    if (lastRunDate) {
                        const elapsed = Date.now() - lastRunDate.getTime();
                        if (elapsed < command.cooldownMs) {
                            const timeLeft = Math.ceil(
                                (command.cooldownMs - elapsed) / 1000,
                            );
                            await interaction.reply({
                                content: `Please wait ${timeLeft} second(s) before reusing the </${interaction.commandName}:${interaction.commandId}> command.`,
                                flags: MessageFlags.Ephemeral,
                            });
                            return;
                        }
                    }
                } catch (error) {
                    console.error(
                        'Failed to verify command cooldown in DB:',
                        error,
                    );
                }
            }

            // 3. Track & increment command usage in DB
            try {
                await db
                    .insert(commandUsageTable)
                    .values({
                        userId: interaction.user.id,
                        commandName: interaction.commandName,
                    })
                    .onConflictDoUpdate({
                        target: [
                            commandUsageTable.userId,
                            commandUsageTable.commandName,
                        ],
                        set: {
                            count: sql`${commandUsageTable.count} + 1`,
                            lastUsedAt: new Date(),
                        },
                    });
            } catch (error) {
                console.error('Failed to record command usage in DB:', error);
            }

            // 4. Command execution
            try {
                await command.execute(client, interaction);
            } catch (error) {
                console.error(
                    `Error executing command ${interaction.commandName}:`,
                    error,
                );
                const errorMessage: InteractionReplyOptions = {
                    content: 'There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral,
                };
                if (interaction.replied || interaction.deferred) {
                    await interaction
                        .followUp(errorMessage)
                        .catch(console.error);
                } else {
                    await interaction.reply(errorMessage).catch(console.error);
                }
            }
        }
    },
} satisfies KEvent<'interactionCreate'>;
