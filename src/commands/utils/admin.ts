import { db } from '@/db';
import { rolesTable } from '@/db/schemas/roles';
import { KCommandCooldownLevels, type KCommand } from '@/lib/KClient';
import {
    ApplicationIntegrationType,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

export default {
    cooldownLevel: KCommandCooldownLevels.User,
    cooldownMs: 300_000,

    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('get the admin role')
        .setIntegrationTypes([ApplicationIntegrationType.GuildInstall])
        .setContexts([InteractionContextType.Guild]),

    async execute(_, interaction) {
        if (!interaction.inGuild() || !interaction.guild) {
            interaction.reply({
                content: 'this command can only be run in server',
                flags: [MessageFlags.Ephemeral],
            });
            return;
        }

        await interaction.deferReply();

        const [roleData] = await db
            .select({ id: rolesTable.roleId })
            .from(rolesTable)
            .where(
                and(
                    eq(rolesTable.roleName, 'admin'),
                    eq(rolesTable.guildId, interaction.guildId || ''),
                ),
            )
            .limit(1);

        if (!roleData) {
            interaction.followUp({
                content: 'Admin Role not Configured',
            });
            return;
        }

        const member = await interaction.guild.members
            .fetch(interaction.user.id)
            .catch(console.error);

        if (!member) return console.log(`interaction.member is ${member}??`);

        if (member.roles.cache.has(roleData.id)) {
            interaction.followUp({
                content: 'You already have admin role idiot',
            });
            return;
        }

        await member.roles.add(roleData.id);

        await interaction.followUp({
            content: 'Admin role granted',
        });
    },
} satisfies KCommand<'chatInput'>;
