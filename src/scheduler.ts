import { Client } from 'discord.js';
import cron from 'node-cron';
import { loadGuildConfig, getConfiguredGuildIds, globalConfig } from './configManager';
import { forwardRandomMessage } from './messageUtils';

// Store the current cron jobs by guild ID
const guildTasks: Record<string, cron.ScheduledTask> = {};

/**
 * Schedule the random message task for a specific guild
 */
export function scheduleGuildTask(client: Client, guildId: string): void {
  // Cancel previous task if exists
  if (guildTasks[guildId]) {
    guildTasks[guildId].stop();
    console.log(`Previous scheduled task stopped for guild ${guildId}`);
  }
  
  const guildConfig = loadGuildConfig(guildId);
  
  // Make sure channels are properly configured
  if (!guildConfig.sourceChannelId || !guildConfig.targetChannelId || !guildConfig.enabled) {
    console.log(`Scheduled task not started for guild ${guildId} because channels are not configured or bot is disabled.`);
    return;
  }
  
  try {
    // Use guild-specific schedule or fall back to global default
    const cronSchedule = guildConfig.cronSchedule || globalConfig.defaultCronSchedule;
    
    // Create a new cron task
    guildTasks[guildId] = cron.schedule(cronSchedule, async () => {
      try {
        const now = new Date();
        console.log(`⏱️ Running scheduled random message task for guild ${guildId} at ${now.toISOString()}`);
        console.log(`🔍 Scanning entire channel history. This may take several minutes...`);
        await forwardRandomMessage(client, guildId);
        console.log(`✅ Successfully completed scheduled task for guild ${guildId}`);
      } catch (error) {
        console.error(`❌ Error in scheduled task for guild ${guildId}:`, error);
      }
    });
    
    console.log(`📅 Scheduled task set to run at: ${cronSchedule} for guild ${guildId}`);
  } catch (error) {
    console.error(`Error setting up scheduled task for guild ${guildId}:`, error);
  }
}

/**
 * Initialize all scheduled tasks for configured guilds
 */
export function initializeAllScheduledTasks(client: Client): void {
  const guildIds = getConfiguredGuildIds();
  
  console.log(`Initializing scheduled tasks for ${guildIds.length} guilds`);
  
  for (const guildId of guildIds) {
    scheduleGuildTask(client, guildId);
  }
}

/**
 * Stop the scheduled task for a specific guild
 */
export function stopGuildTask(guildId: string): void {
  if (guildTasks[guildId]) {
    guildTasks[guildId].stop();
    delete guildTasks[guildId];
    console.log(`Stopped scheduled task for guild ${guildId}`);
  }
}
