import type { KEvent } from '@/lib/KClient';

export default {
    name: 'interactionCreate',
    execute(client, interaction) {
        if (
            interaction.isContextMenuCommand() ||
            interaction.isChatInputCommand()
        ) {
            const command = client.commands.get(interaction.commandName);

            if (!command)
                return interaction.reply({
                    content: 'Command not found',
                    ephemeral: true,
                });

            command.execute(client, interaction);
        }
    },
} as KEvent<'interactionCreate'>;
