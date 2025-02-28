import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Config directory path
const CONFIG_DIR = path.join(__dirname, '../configs');
const GLOBAL_CONFIG_PATH = path.join(CONFIG_DIR, 'global.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Config interface for guild-specific settings
export interface GuildConfig {
  sourceChannelId: string;
  targetChannelId: string;
  cronSchedule: string;
  messageLimit: number;
  useWeightedSelection: boolean;
  maxMessagesToFetch: number;
  fetchAllMessages: boolean;
  enabled: boolean;
}

// Global config interface
export interface GlobalConfig {
  token: string;
  defaultCronSchedule: string;
  defaultFetchAllMessages: boolean;
}

// Default global configuration
const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  token: process.env.TOKEN || '',
  defaultCronSchedule: process.env.DEFAULT_CRON_SCHEDULE || '0 12 * * *',
  defaultFetchAllMessages: true
};

// Default guild configuration
const DEFAULT_GUILD_CONFIG: GuildConfig = {
  sourceChannelId: '',
  targetChannelId: '',
  cronSchedule: '',  // Will use global default if empty
  messageLimit: parseInt(process.env.MESSAGE_LIMIT || '100'),
  useWeightedSelection: process.env.USE_WEIGHTED_SELECTION === 'true',
  maxMessagesToFetch: Number.MAX_SAFE_INTEGER,
  fetchAllMessages: true,
  enabled: true
};

// Load global config
export function loadGlobalConfig(): GlobalConfig {
  try {
    if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
      const fileConfig = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf8'));
      return { ...DEFAULT_GLOBAL_CONFIG, ...fileConfig };
    }
  } catch (error) {
    console.error('Error loading global config file:', error);
  }
  
  // If no file exists or error occurred, create a new one with default values
  saveGlobalConfig(DEFAULT_GLOBAL_CONFIG);
  return DEFAULT_GLOBAL_CONFIG;
}

// Save global config
export function saveGlobalConfig(config: GlobalConfig): void {
  try {
    // Always ensure token from env takes precedence
    if (process.env.TOKEN) {
      config.token = process.env.TOKEN;
    }
    
    fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving global config file:', error);
  }
}

// Load config for a specific guild
export function loadGuildConfig(guildId: string): GuildConfig {
  const configPath = path.join(CONFIG_DIR, `guild-${guildId}.json`);
  
  try {
    if (fs.existsSync(configPath)) {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...DEFAULT_GUILD_CONFIG, ...fileConfig };
    }
  } catch (error) {
    console.error(`Error loading config for guild ${guildId}:`, error);
  }
  
  // If no file exists or error occurred, create a new one with default values
  const newConfig = { ...DEFAULT_GUILD_CONFIG };
  saveGuildConfig(guildId, newConfig);
  return newConfig;
}

// Save config for a specific guild
export function saveGuildConfig(guildId: string, config: GuildConfig): void {
  const configPath = path.join(CONFIG_DIR, `guild-${guildId}.json`);
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Config saved successfully for guild ${guildId}`);
  } catch (error) {
    console.error(`Error saving config for guild ${guildId}:`, error);
  }
}

// Get all configured guilds
export function getConfiguredGuildIds(): string[] {
  try {
    const files = fs.readdirSync(CONFIG_DIR);
    return files
      .filter(file => file.startsWith('guild-') && file.endsWith('.json'))
      .map(file => file.replace('guild-', '').replace('.json', ''));
  } catch (error) {
    console.error('Error reading guild configs:', error);
    return [];
  }
}

// Load global config
const globalConfig = loadGlobalConfig();

// Validate required config
if (!globalConfig.token) {
  throw new Error('Missing bot token in environment variables');
}

export { globalConfig };
