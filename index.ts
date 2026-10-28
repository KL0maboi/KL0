import KClient from '@/lib/KClient';

const client = new KClient();

client.login(process.env.TOKEN);
