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
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
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
        const categories = readdirSync(path, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);

        for (const category of categories) {
            const dirPath = join(path, category);
            const commandFiles = readdirSync(dirPath);

            for (const command of commandFiles) {
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

export type KSlashCommandBuilder =
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder;

interface KCommandTypes {
    chatInput: {
        data: KSlashCommandBuilder;
        interaction: ChatInputCommandInteraction;
    };

    contextMenu: {
        data: ContextMenuCommandBuilder;
        interaction: ContextMenuCommandInteraction;
    };

    both: {
        data: [KSlashCommandBuilder, ContextMenuCommandBuilder];
        interaction:
            ChatInputCommandInteraction | ContextMenuCommandInteraction;
    };
}

export enum KCommandCooldownLevels {
    User = 'user', // only for that specific user
    Server = 'server', // globally on whole server
    None = 'none', // no cooldown
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
    restricted?: boolean;
    cooldownMs?: number;
    cooldownLevel?: KCommandCooldownLevels;
};

export default KClient;
