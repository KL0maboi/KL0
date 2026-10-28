import type { KCommand } from '@/lib/KClient';
import {
    ApplicationIntegrationType,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder,
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('basic ping command')
        .setIntegrationTypes([
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
        ])
        .setContexts([
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel,
        ]),
    execute(_, interaction) {
        interaction.reply({
            content: 'pong',
            flags: [MessageFlags.Ephemeral],
        });
    },
} as KCommand<'chatInput'>;
