import { db } from '@/db';
import { nameGodTable, rolesTable } from '@/db/schema';
import { NAME_GOD_INTERVAL } from '@/lib/changeNameGod';
import type { KCommand } from '@/lib/KClient';
import {
    ApplicationIntegrationType,
    EmbedBuilder,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import { and, desc, eq } from 'drizzle-orm';

export default {
    data: new SlashCommandBuilder()
        .setName('namegod')
        .setDescription('check namegod details')
        .setIntegrationTypes([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ])
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel,
        ]),
    async execute(client, interaction) {
        await interaction.deferReply({
            flags: [MessageFlags.Ephemeral],
        });

        const [latestNameGod] = await db
            .select({
                userId: nameGodTable.userId,
                count: nameGodTable.count,
                lastNameGodAt: nameGodTable.lastNameGodAt,
            })
            .from(nameGodTable)
            .orderBy(desc(nameGodTable.lastNameGodAt))
            .limit(1);

        if (!latestNameGod) {
            await interaction.followUp({
                content:
                    'No Name God has been crowned yet. The rotation will trigger soon!',
            });
            return;
        }

        const targetGuildId = interaction.guildId ?? process.env.GUILD_ID;
        let roleMention: string | null = null;

        if (targetGuildId) {
            const [roleData] = await db
                .select({ id: rolesTable.roleId })
                .from(rolesTable)
                .where(
                    and(
                        eq(rolesTable.roleName, 'name_god'),
                        eq(rolesTable.guildId, targetGuildId),
                    ),
                )
                .limit(1);

            if (roleData) {
                roleMention = `<@&${roleData.id}>`;
            }
        }

        const lastAt = latestNameGod.lastNameGodAt;
        const nextRotationDate = new Date(lastAt.getTime());
        nextRotationDate.setDate(
            nextRotationDate.getDate() + NAME_GOD_INTERVAL,
        );

        const now = new Date();
        const isOverdue = now >= nextRotationDate;

        const lastUnix = Math.floor(lastAt.getTime() / 1000);
        const nextUnix = Math.floor(nextRotationDate.getTime() / 1000);

        let avatarUrl: string | null = null;
        if (interaction.guild) {
            const member = await interaction.guild.members
                .fetch(latestNameGod.userId)
                .catch(() => null);
            if (member) {
                avatarUrl = member.displayAvatarURL();
            }
        }

        if (!avatarUrl) {
            const user = await client.users
                .fetch(latestNameGod.userId)
                .catch(() => null);
            if (user) {
                avatarUrl = user.displayAvatarURL();
            }
        }

        const fields = [
            {
                name: 'Current Name God',
                value: `<@${latestNameGod.userId}>`,
                inline: true,
            },
            ...(roleMention
                ? [
                      {
                          name: 'Role',
                          value: roleMention,
                          inline: false,
                      },
                  ]
                : []),
            {
                name: 'Times Crowned',
                value: `${latestNameGod.count}`,
                inline: false,
            },
            {
                name: 'Last Crowned',
                value: `<t:${lastUnix}:R>`,
                inline: false,
            },
            {
                name: 'Next Rotation',
                value: isOverdue
                    ? '⏰ **Due now** (waiting for scheduler check)'
                    : `<t:${nextUnix}:R>`,
                inline: false,
            },
        ];

        const embed = new EmbedBuilder()
            .setTitle('👑 Name God Rotation Status')
            .setColor(isOverdue ? 0xed4245 : 0xfee75c)
            .addFields(fields)
            .setFooter({ text: `Rotation interval: ${NAME_GOD_INTERVAL} days` })
            .setTimestamp();

        if (avatarUrl) {
            embed.setThumbnail(avatarUrl);
        }

        await interaction.followUp({
            embeds: [embed],
        });
    },
} satisfies KCommand<'chatInput'>;
