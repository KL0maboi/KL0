import { readdirSync } from 'fs';
import { join } from 'path';
import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Client,
    Collection,
    IntentsBitField,
    SlashCommandBuilder,
} from 'discord.js';
import type {
    ClientEvents,
    ContextMenuCommandBuilder,
    ContextMenuCommandInteraction,
} from 'discord.js';

class KClient<Ready extends boolean> extends Client<Ready> {
    events = new Collection<string, KEvent<keyof ClientEvents>>();
    commands = new Collection<string, KCommand<keyof KCommandTypes>>();

    constructor() {
        super({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.GuildMembers,
                IntentsBitField.Flags.MessageContent,
                IntentsBitField.Flags.GuildVoiceStates,
            ],
        });

        this.loadEvents();
        this.loadCommands();
    }

    async loadEvents() {
        const eventFiles = readdirSync(join(__dirname, '../events'));

        for (const file of eventFiles) {
            const event: KEvent<keyof ClientEvents> = (
                await import(`../events/${file}`)
            ).default;

            if (event.once) {
                this.once(event.name, (...args) =>
                    event.execute(this as KClient<true>, ...args),
                );
            } else {
                this.on(event.name, (...args) =>
                    event.execute(this as KClient<true>, ...args),
                );
            }
        }
    }

    async loadCommands() {
        const path = join(__dirname, '../commands');
        const categories = readdirSync(path);

        for (const category of categories) {
            const dirPath = join(path, category);
            const commands = readdirSync(dirPath);

            for (const command of commands) {
                const cmdPath = join(dirPath, command);
                const cmdData: KCommand<keyof KCommandTypes> = (
                    await import(cmdPath)
                ).default;

                const data = cmdData.data;

                if (Array.isArray(data)) {
                    for (const d of data) {
                        this.commands.set(d.name, cmdData);
                    }
                } else {
                    this.commands.set(data.name, cmdData);
                }
            }
        }
    }
}

export type KEvent<Event extends keyof ClientEvents> = {
    name: Event;
    once?: boolean;
    execute: (
        client: KClient<true>,
        ...args: ClientEvents[Event]
    ) => Promise<void> | void;
};

interface KCommandTypes {
    chatInput: {
        data: SlashCommandBuilder;
        interaction: ChatInputCommandInteraction;
    };

    contextMenu: {
        data: ContextMenuCommandBuilder;
        interaction: ContextMenuCommandInteraction;
    };

    both: {
        data: [SlashCommandBuilder, ContextMenuCommandBuilder];
        interaction:
            | ChatInputCommandInteraction
            | ContextMenuCommandInteraction;
    };
}

export type KCommand<T extends keyof KCommandTypes> = {
    data: KCommandTypes[T]['data'];

    execute(
        client: KClient<true>,
        interaction: KCommandTypes[T]['interaction'],
    ): void | Promise<void>;

    autocomplete?(
        client: KClient<true>,
        interaction: AutocompleteInteraction,
    ): void | Promise<void>;

    dev?: boolean;
};

export default KClient;
