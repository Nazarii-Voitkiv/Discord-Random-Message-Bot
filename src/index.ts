import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Partials
} from 'discord.js';
import { globalConfig } from './configManager';
import { forwardRandomMessage } from './messageUtils';
import { handleTextCommand } from './commandHandler';
import { initializeAllScheduledTasks } from './scheduler';

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

// Register slash command
const commands = [
  new SlashCommandBuilder()
    .setName('randomessage')
    .setDescription('Send a random message from the source channel to the target channel')
    .toJSON()
];

// When the bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot is ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Currently in ${readyClient.guilds.cache.size} servers`);
  
  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(globalConfig.token);
  
  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');
    console.log('');
    console.log('IMPORTANT: On each server, use these commands to set up the bot:');
    console.log('!setsource #your-source-channel');
    console.log('!settarget #your-target-channel');
    console.log('!setschedule minute hour day month weekday (in cron format)');
    console.log('');
    
    // Initialize scheduled tasks for all configured guilds
    initializeAllScheduledTasks(client);
    
  } catch (error) {
    console.error('Error setting up the bot:', error);
  }
});

// Handle new guild joins
client.on(Events.GuildCreate, (guild) => {
  console.log(`Bot was added to a new server: ${guild.name} (${guild.id})`);
});

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand() || !interaction.guild) return;
  
  if (interaction.commandName === 'randomessage') {
    const commandInteraction = interaction as ChatInputCommandInteraction;
    await commandInteraction.deferReply({ ephemeral: true });
    
    try {
      await forwardRandomMessage(client, interaction.guild.id);
      await commandInteraction.editReply({ 
        content: `✅ Successfully sent a random message to the target channel!`
      });
    } catch (error) {
      console.error(`Error handling command for guild ${interaction.guild.id}:`, error);
      await commandInteraction.editReply({ 
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
});

// Handle text commands
client.on(Events.MessageCreate, handleTextCommand);

// Login to Discord
client.login(globalConfig.token);
