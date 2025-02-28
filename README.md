# Discord Random Message Bot (TypeScript)

This bot selects a random message from one Discord channel and forwards it to another. It performs this action daily on a schedule and also supports a manual command.

## Features

- 🕒 Automatically sends a random message once per day
- 💬 Command to manually send a random message
- 🖼️ Supports messages with images
- ⚙️ Configurable source and target channels
- 📝 Written in TypeScript for better code quality
- 🔧 Easy channel configuration through commands

## Setup Instructions

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your bot token:
   ```
   TOKEN=your_discord_bot_token_here
   ```

4. Build the project:
   ```
   npm run build
   ```

5. Start the bot:
   ```
   npm start
   ```

## Channel Configuration

Use these commands to set up the bot's channels:

- `!setsource #channel` - Set the source channel for random messages
- `!settarget #channel` - Set the target channel where messages will be sent
- `!showchannels` - Show current channel configuration
- `!help` - Show available commands

## Commands

- `!randomessage` - Manually send a random message from source to target channel
- `/randomessage` - Slash command version of the above

## Requirements

- Node.js 16.9.0 or higher
- Discord bot token with message content intent enabled
