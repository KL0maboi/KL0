import { db } from '@/db';
import type KClient from './KClient';
import { rolesTable } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nameGodTable } from '@/db/schemas/nameGod';
import type { GuildMember } from 'discord.js';
import { channelsTable } from '@/db/schemas/channels';

export const NAME_GOD_INTERVAL = 3; // in days

export async function changeNameGod(client: KClient<true>) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);

    if (!guild)
        throw new Error('Error: GUILD_ID is NOT cofigured in environment');

    const members = await guild.members.fetch();

    const [roleData] = await db
        .select({ id: rolesTable.roleId, name: rolesTable.roleName })
        .from(rolesTable)
        .where(
            and(
                eq(rolesTable.roleName, 'name_god'),
                eq(rolesTable.guildId, process.env.GUILD_ID!),
            ),
        )
        .limit(1);

    if (!roleData) throw new Error('Error: NAME_GOD role is not set');

    const role = await guild.roles.fetch(roleData.id);

    if (!role)
        throw new Error(`Error: ROLE ${roleData.name} is MISSING from server`);

    role.members.forEach((member) => {
        member.roles.remove(role.id);
    });

    const stats = await db
        .select({
            userId: nameGodTable.userId,
            lastNameGodAt: nameGodTable.lastNameGodAt,
            count: nameGodTable.count,
        })
        .from(nameGodTable)
        .orderBy(nameGodTable.lastNameGodAt, nameGodTable.count)
        .limit(4);

    let selected: GuildMember | undefined;

    if (stats.length === 0) return;
    else {
        const randomIndex = Math.floor(Math.random() * stats.length);

        selected = members.find(
            (user) => user.id === stats[randomIndex]?.userId,
        );
    }

    if (!selected) throw new Error('Error: `selected` user is UNDEFINED');

    await selected.roles.add(role.id);

    await db
        .update(nameGodTable)
        .set({
            count: sql`${nameGodTable.count} + 1`,
            lastNameGodAt: sql`NOW()`,
        })
        .where(eq(nameGodTable.userId, selected.user.id));

    const [channelData] = await db
        .select({ id: channelsTable.channelId, name: channelsTable.channel })
        .from(channelsTable)
        .where(
            and(
                eq(channelsTable.channel, 'name_god_announcement'),
                eq(channelsTable.guildId, guild.id),
            ),
        )
        .limit(1);

    if (!channelData)
        throw new Error('Error: channel `name_god_announcement` is not set');

    const channel = await guild.channels.fetch(channelData.id);

    if (!channel)
        throw new Error(
            `Error: CHANNEL ${channelData.name} is MISSING from server`,
        );

    if (channel.isSendable())
        channel.send({
            content: `Name god has been changed to ${selected.displayName}`,
        });

    console.info('info: CHANGED name_god to ' + selected.displayName);
}
