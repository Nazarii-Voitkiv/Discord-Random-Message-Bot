import { Message, Channel, ChannelType, TextChannel, NewsChannel } from 'discord.js';
import { loadGuildConfig, saveGuildConfig, globalConfig } from './configManager';
import { forwardRandomMessage } from './messageUtils';
import { scheduleGuildTask } from './scheduler';

// Command prefix
const PREFIX = '!';

// Process text commands
export async function handleTextCommand(message: Message): Promise<void> {
  // Ignore messages from bots, DMs, or messages that don't start with the prefix
  if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;

  const guildId = message.guild.id;
  const guildConfig = loadGuildConfig(guildId);

  // Parse command and arguments
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  try {
    switch (command) {
      case 'setsource':
        await handleSetSourceCommand(message, guildId, guildConfig);
        break;
        
      case 'settarget':
        await handleSetTargetCommand(message, guildId, guildConfig);
        break;
        
      case 'setschedule':
        await handleSetScheduleCommand(message, args, guildId, guildConfig);
        break;
        
      case 'showchannels':
        await handleShowChannelsCommand(message, guildId, guildConfig);
        break;
        
      case 'randomessage':
        await handleRandomMessageCommand(message, guildId, guildConfig);
        break;
        
      case 'help':
        await handleHelpCommand(message);
        break;
    }
  } catch (error) {
    console.error(`Error handling command ${command} for guild ${guildId}:`, error);
    await message.reply(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Command handlers with guild-specific configurations
async function handleSetSourceCommand(message: Message, guildId: string, guildConfig: any): Promise<void> {
  const mentionedChannel = message.mentions.channels.first();
  
  if (!mentionedChannel) {
    await message.reply('Please mention a channel after the command. For example: `!setsource #general`');
    return;
  }
  
  // Check if channel is a text channel
  if (!isTextBasedChannel(mentionedChannel)) {
    await message.reply('Please mention a text channel, not a voice or category channel.');
    return;
  }
  
  guildConfig.sourceChannelId = mentionedChannel.id;
  saveGuildConfig(guildId, guildConfig);
  
  await message.reply(`Channel **${mentionedChannel.name}** has been set as the source channel for this server.`);
  
  // Update scheduler if both channels are set
  if (guildConfig.sourceChannelId && guildConfig.targetChannelId) {
    scheduleGuildTask(message.client, guildId);
  }
}

async function handleSetTargetCommand(message: Message, guildId: string, guildConfig: any): Promise<void> {
  const mentionedChannel = message.mentions.channels.first();
  
  if (!mentionedChannel) {
    await message.reply('Please mention a channel after the command. For example: `!settarget #announcements`');
    return;
  }
  
  // Check if channel is a text channel
  if (!isTextBasedChannel(mentionedChannel)) {
    await message.reply('Please mention a text channel, not a voice or category channel.');
    return;
  }
  
  guildConfig.targetChannelId = mentionedChannel.id;
  saveGuildConfig(guildId, guildConfig);
  
  await message.reply(`Channel **${mentionedChannel.name}** has been set as the target channel for this server.`);
  
  // Update scheduler if both channels are set
  if (guildConfig.sourceChannelId && guildConfig.targetChannelId) {
    scheduleGuildTask(message.client, guildId);
  }
}

async function handleSetScheduleCommand(message: Message, args: string[], guildId: string, guildConfig: any): Promise<void> {
  if (args.length === 0) {
    await message.reply(
      'Please provide a cron schedule. Examples:\n' +
      '`!setschedule 0 12 * * *` - Every day at 12:00\n' +
      '`!setschedule 0 9 * * 1-5` - Every weekday at 9:00\n' +
      '`!setschedule 0 20 * * 0,6` - Every weekend at 20:00'
    );
    return;
  }
  
  const cronSchedule = args.join(' ');
  
  // Validate cron schedule
  try {
    // Basic validation - this doesn't check all edge cases
    const parts = cronSchedule.split(' ');
    if (parts.length !== 5) {
      throw new Error('Cron schedule must have 5 parts: minute hour day-of-month month day-of-week');
    }
    
    guildConfig.cronSchedule = cronSchedule;
    saveGuildConfig(guildId, guildConfig);
    
    // Restart the scheduled task with the new schedule
    scheduleGuildTask(message.client, guildId);
    
    await message.reply(`Schedule has been set to \`${cronSchedule}\``);
  } catch (error) {
    await message.reply(`Invalid cron schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleShowChannelsCommand(message: Message, guildId: string, guildConfig: any): Promise<void> {
  const sourceChannel = guildConfig.sourceChannelId 
    ? `<#${guildConfig.sourceChannelId}> (ID: ${guildConfig.sourceChannelId})` 
    : 'Not set';
    
  const targetChannel = guildConfig.targetChannelId 
    ? `<#${guildConfig.targetChannelId}> (ID: ${guildConfig.targetChannelId})` 
    : 'Not set';
    
  await message.reply(
    `**Current Channel Configuration:**\n` +
    `Source Channel: ${sourceChannel}\n` +
    `Target Channel: ${targetChannel}\n` +
    `Schedule: \`${guildConfig.cronSchedule}\` (${describeCronSchedule(guildConfig.cronSchedule)})`
  );
}

async function handleRandomMessageCommand(message: Message, guildId: string, guildConfig: any): Promise<void> {
  const reply = await message.reply('⏳ Selecting and forwarding a random message... This may take a long time as I need to scan the **ENTIRE** channel history!');
  
  try {
    await forwardRandomMessage(message.client, guildId);
    await reply.edit(`✅ Successfully sent a random message to <#${guildConfig.targetChannelId}>!`);
  } catch (error) {
    await reply.edit(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function handleHelpCommand(message: Message): Promise<void> {
  await message.reply(
    `**Available Commands:**\n` +
    `\`!setsource #channel\` - Set the source channel for random messages\n` +
    `\`!settarget #channel\` - Set the target channel for random messages\n` +
    `\`!setschedule 0 12 * * *\` - Set when to send daily messages (cron format)\n` +
    `\`!showchannels\` - Show current channel configuration\n` +
    `\`!randomessage\` - Manually send a random message from source to target channel\n` +
    `\`!help\` - Show this help message\n\n` +
    `You can also use the slash command \`/randomessage\` to send a random message.`
  );
}

// Helper function to check if a channel is a text-based guild channel (TextChannel or NewsChannel)
function isTextBasedChannel(channel: Channel): channel is TextChannel | NewsChannel {
  return channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement;
}

// Helper function to make cron schedules more human-readable
function describeCronSchedule(cronSchedule: string): string {
  const parts = cronSchedule.split(' ');
  if (parts.length !== 5) return "Invalid schedule";
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (dayOfMonth === '*' && month === '*') {
    if (dayOfWeek === '*') {
      return `Every day at ${hour}:${minute === '0' ? '00' : minute}`;
    } else if (dayOfWeek === '1-5') {
      return `Every weekday at ${hour}:${minute === '0' ? '00' : minute}`;
    } else if (dayOfWeek === '0,6') {
      return `Every weekend at ${hour}:${minute === '0' ? '00' : minute}`;
    }
  }
  
  return "Custom schedule";
}
