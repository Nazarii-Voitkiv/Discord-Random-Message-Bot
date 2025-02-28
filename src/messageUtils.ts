import { Client, EmbedBuilder, Message, TextChannel } from 'discord.js';
import { loadGuildConfig } from './configManager';

/**
 * Gets a random message from the source channel using ALL available history
 * for a specific guild
 */
export async function getRandomMessage(client: Client, guildId: string): Promise<Message> {
  const guildConfig = loadGuildConfig(guildId);
  
  // Check if source channel ID is properly set
  if (!guildConfig.sourceChannelId) {
    throw new Error('Source channel not configured for this server. Use !setsource #channel to set it.');
  }

  const sourceChannel = await client.channels.fetch(guildConfig.sourceChannelId);
  if (!sourceChannel || !(sourceChannel instanceof TextChannel)) {
    throw new Error('Source channel not found or is not a text channel');
  }
  
  // Status message for user feedback
  console.log(`Starting to fetch ABSOLUTELY ALL messages from channel #${sourceChannel.name} without any limitations`);
  
  // Discord API can only fetch 100 messages at once
  const messagesPerBatch = 100;
  
  let allMessages: Message[] = [];
  let lastId: string | undefined;
  let fetchedTotal = 0;
  let validTotal = 0;
  let batchCount = 0;
  
  // Fetch ALL messages using pagination with NO LIMIT whatsoever
  // Continue until we hit the end of the channel history
  while (true) {
    try {
      batchCount++;
      const options: { limit: number; before?: string } = { limit: messagesPerBatch };
      if (lastId) {
        options.before = lastId;
      }
      
      // Fetch a batch of messages
      const messages = await sourceChannel.messages.fetch(options);
      fetchedTotal += messages.size;
      
      // If we got no messages, we've reached the end of the channel history
      if (messages.size === 0) {
        console.log(`✅ Reached the end of channel history after ${batchCount} batches`);
        break;
      }
      
      // Filter valid messages (not from bots and not empty)
      const validBatchMessages = Array.from(messages.values())
        .filter(msg => !msg.author.bot && msg.content.trim() !== '');
      
      validTotal += validBatchMessages.length;
      allMessages = [...allMessages, ...validBatchMessages];
      
      // Update the last ID for the next pagination query
      lastId = messages.last()?.id;
      
      // Log progress every few batches to avoid console spam
      if (batchCount % 10 === 0) {
        console.log(`Progress: ${fetchedTotal} messages fetched so far (${validTotal} valid) - continuing indefinitely until ALL messages are retrieved`);
      }
      
      // Add delay between requests to avoid rate limits
      // Make the delay adaptive - longer delay if we've fetched a lot already
      const delayMs = Math.min(1000, 200 + Math.floor(batchCount / 20) * 100);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (error) {
      console.error(`Error fetching messages batch ${batchCount}:`, error);
      
      // If we hit an error (likely rate limiting), wait longer and then continue
      const errorWaitTime = 5000 + (Math.floor(batchCount / 10) * 1000);
      console.log(`Waiting ${errorWaitTime/1000} seconds before retrying due to error...`);
      await new Promise(resolve => setTimeout(resolve, errorWaitTime));
      
      // Never give up, never surrender - always keep trying to fetch more messages
      continue;
    }
  }
  
  if (allMessages.length === 0) {
    throw new Error('No valid messages found in the source channel');
  }
  
  console.log(`✅ Completed fetching ALL messages. Total: ${fetchedTotal}, Valid: ${validTotal}`);
  console.log(`Channel history complete! Retrieved messages span the entire channel history.`);
  
  // Select a truly random message from ALL fetched valid messages
  const randomIndex = Math.floor(Math.random() * allMessages.length);
  const selectedMessage = allMessages[randomIndex];
  
  const messageDate = new Date(selectedMessage.createdTimestamp).toLocaleString();
  console.log(`🎲 Selected random message from ${messageDate}`);
  console.log(`💬 Message content: "${selectedMessage.content.substring(0, 50)}${selectedMessage.content.length > 50 ? '...' : ''}"`);
  
  return selectedMessage;
}

/**
 * Forwards a random message from source to target channel
 * for a specific guild
 */
export async function forwardRandomMessage(client: Client, guildId: string): Promise<boolean> {
  try {
    const guildConfig = loadGuildConfig(guildId);
    
    // Check if source and target channels are configured
    if (!guildConfig.sourceChannelId) {
      throw new Error('Source channel not configured for this server. Use !setsource #channel to set it.');
    }
    
    if (!guildConfig.targetChannelId) {
      throw new Error('Target channel not configured for this server. Use !settarget #channel to set it.');
    }
    
    const randomMessage = await getRandomMessage(client, guildId);
    const targetChannel = await client.channels.fetch(guildConfig.targetChannelId);
    
    if (!targetChannel || !(targetChannel instanceof TextChannel)) {
      throw new Error('Target channel not found or is not a text channel');
    }
    
    // Create embed for the random message
    const embed = new EmbedBuilder()
      .setAuthor({
        name: randomMessage.author.username,
        iconURL: randomMessage.author.displayAvatarURL()
      })
      .setDescription(randomMessage.content)
      .setColor('#3498db')
      .setTimestamp(randomMessage.createdAt)
      .setFooter({
        text: 'Random message from the past'
      });
    
    // Add image if the message has one
    if (randomMessage.attachments.size > 0) {
      const attachment = randomMessage.attachments.first();
      if (attachment && attachment.contentType?.startsWith('image/')) {
        embed.setImage(attachment.url);
      }
    }
    
    // Send the embed to the target channel
    await targetChannel.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error(`Error forwarding random message for guild ${guildId}:`, error);
    throw error;
  }
}

/**
 * Advanced random selection with message age weighting for a specific guild
 */
export async function getWeightedRandomMessage(client: Client, guildId: string): Promise<Message> {
  const guildConfig = loadGuildConfig(guildId);
  
  // Check if source channel ID is properly set
  if (!guildConfig.sourceChannelId) {
    throw new Error('Source channel not configured for this server. Use !setsource #channel to set it.');
  }
  
  const sourceChannel = await client.channels.fetch(guildConfig.sourceChannelId);
  if (!sourceChannel || !(sourceChannel instanceof TextChannel)) {
    throw new Error('Source channel not found or is not a text channel');
  }
  
  // Fetch messages
  const messages = await sourceChannel.messages.fetch({ limit: guildConfig.messageLimit });
  
  // Filter valid messages
  const validMessages = Array.from(messages.values())
    .filter(msg => !msg.author.bot && msg.content.trim() !== '');
  
  if (validMessages.length === 0) {
    throw new Error('No valid messages found in the source channel');
  }
  
  // Calculate weights based on message age and content (just an example)
  // Messages from different time periods have equal chance of being selected
  const now = Date.now();
  const messagesWithAge = validMessages.map(msg => ({
    message: msg,
    ageInDays: (now - msg.createdTimestamp) / (1000 * 60 * 60 * 24)
  }));
  
  // Group messages by age brackets (e.g., today, this week, this month, older)
  const today = messagesWithAge.filter(m => m.ageInDays < 1);
  const thisWeek = messagesWithAge.filter(m => m.ageInDays >= 1 && m.ageInDays < 7);
  const thisMonth = messagesWithAge.filter(m => m.ageInDays >= 7 && m.ageInDays < 30);
  const older = messagesWithAge.filter(m => m.ageInDays >= 30);
  
  // Each time period gets equal chance if it has messages
  const groups = [today, thisWeek, thisMonth, older].filter(group => group.length > 0);
  
  if (groups.length === 0) {
    throw new Error('No valid messages found after filtering');
  }
  
  // Select a random group, then a random message from that group
  const randomGroup = groups[Math.floor(Math.random() * groups.length)];
  const randomMessage = randomGroup[Math.floor(Math.random() * randomGroup.length)].message;
  
  return randomMessage;
}
