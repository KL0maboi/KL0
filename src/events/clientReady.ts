import type { KEvent } from '@/lib/KClient';

export default {
    name: 'clientReady',
    once: true,
    execute(client) {
        console.log(`Logged in as ${client.user?.username}!`);
    },
} as KEvent<'clientReady'>;
