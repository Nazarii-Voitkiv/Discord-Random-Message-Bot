import dotenv from 'dotenv';

dotenv.config();

interface Config {
  token: string;
  sourceChannelId: string;
  targetChannelId: string;
  cronSchedule: string;
  messageLimit: number;
}

if (!process.env.TOKEN) {
  throw new Error('Missing bot token in environment variables');
}

if (!process.env.SOURCE_CHANNEL_ID) {
  throw new Error('Missing source channel ID in environment variables');
}

if (!process.env.TARGET_CHANNEL_ID) {
  throw new Error('Missing target channel ID in environment variables');
}

const config: Config = {
  // Discord Bot Token
  token: process.env.TOKEN,
  
  // Channel IDs
  sourceChannelId: process.env.SOURCE_CHANNEL_ID,
  targetChannelId: process.env.TARGET_CHANNEL_ID,
  
  // Cron schedule for daily random message (default: 12:00 PM every day)
  cronSchedule: process.env.CRON_SCHEDULE || '0 12 * * *',
  
  // Maximum number of messages to fetch when selecting a random one
  messageLimit: 100
};

export default config;
