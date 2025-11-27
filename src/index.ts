// src/index.ts
import "dotenv/config";
import fs from "fs";
import path from "path";
import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import prisma from "./utils/prisma";
import { routeMessage } from "./commandRouter";

// Slash commands container
const slashCommands = new Map<string, any>();
const slashData: any[] = [];

// Load all slash commands automatically
const slashDir = path.join(__dirname, "commands", "slash");
for (const file of fs.readdirSync(slashDir)) {
  if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
  const cmd = require(path.join(slashDir, file));

  if (cmd.data && cmd.execute) {
    slashCommands.set(cmd.data.name, cmd);
    slashData.push(cmd.data.toJSON());
  }
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN missing in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// 🔥 Register slash commands automatically when bot starts
client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  try {
    await prisma.$connect();
    console.log("Prisma connected.");
  } catch (e) {
    console.error("Prisma failed:", e);
  }

  const rest = new REST({ version: "10" }).setToken(token);

  try {
    // Auto-register in ALL guilds bot is currently in
    for (const [guildId] of client.guilds.cache) {
      await rest.put(
        Routes.applicationGuildCommands(client.user!.id, guildId),
        { body: slashData }
      );
      console.log(`Registered slash commands in guild: ${guildId}`);
    }
  } catch (err) {
    console.error("Slash registration error:", err);
  }
});

// Handle incoming slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = slashCommands.get(interaction.commandName);
  if (!cmd) return interaction.reply({ content: "Unknown slash command", ephemeral: true });

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error("Slash command error:", err);
    try {
      if (interaction.replied) {
        await interaction.followUp({ content: "Command error", ephemeral: true });
      } else {
        await interaction.reply({ content: "Command error", ephemeral: true });
      }
    } catch {}
  }
});

// Keep your message commands
client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("!") || message.author.bot) return;
  await routeMessage(client, message);
});

client.login(token);
