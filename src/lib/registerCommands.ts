import {
    Collection,
    ContextMenuCommandBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
} from 'discord.js';
import KClient from './KClient';

const TOKEN = process.env.TOKEN || '';

const client = new KClient<true>();

client.once('clientReady', async () => {
    const rest = new REST().setToken(TOKEN);

    const body = new Collection<
        string,
        SlashCommandBuilder | ContextMenuCommandBuilder
    >();

    try {
        console.log('Started refreshing application (/) commands.');

        for (const i of client.commands.values()) {
            const data = i.data;

            if (Array.isArray(data)) {
                for (const d of data) {
                    body.set(d.name, d);
                }
            } else {
                body.set(data.name, data);
            }
        }

        const GUILD_ID = process.env.GUILD_ID;

        if (GUILD_ID)
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, GUILD_ID),
                {
                    body: [...body.values()],
                },
            );

        await rest.put(Routes.applicationCommands(client.user.id), {
            body: [...body.values()],
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }

    client.destroy();
});

client.login(TOKEN);
