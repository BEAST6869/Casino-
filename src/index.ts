// src/index.ts
import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ChatInputCommandInteraction,
  Interaction
} from "discord.js";
import prisma from "./utils/prisma";
import { routeMessage } from "./commandRouter";
import { getGuildConfig } from "./services/guildConfigService";
import { safeInteractionReply } from "./utils/interactionHelpers";

// --- load slash commands automatically from src/commands/slash ---
const slashCommands = new Map<string, any>();
const slashData: any[] = [];
const slashDir = path.join(__dirname, "commands", "slash");

if (fs.existsSync(slashDir)) {
  for (const file of fs.readdirSync(slashDir)) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;
    // require the module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join(slashDir, file));
    if (mod && mod.data && mod.execute) {
      slashCommands.set(mod.data.name, mod);
      slashData.push(mod.data.toJSON());
      console.log(`Loaded slash command: ${mod.data.name}`);
    }
  }
} else {
  console.log("No slash commands directory found; skipping slash load.");
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN is missing in your .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);

  // connect prisma
  try {
    await prisma.$connect();
    console.log("📦 Prisma connected");
  } catch (err) {
    console.error("Prisma connection failed:", err);
    process.exit(1);
  }

  // register slash commands to each guild the bot is in (guild-scoped)
  if (slashData.length > 0) {
    const rest = new REST({ version: "10" }).setToken(token);

    try {
      for (const [guildId] of client.guilds.cache) {
        try {
          await rest.put(Routes.applicationGuildCommands(client.user!.id, guildId), {
            body: slashData,
          });
          console.log(`Registered ${slashData.length} slash command(s) in guild ${guildId}`);
        } catch (gerr) {
          console.warn(`Failed to register slash commands in guild ${guildId}:`, gerr);
        }
      }
    } catch (err) {
      console.error("Error while registering slash commands:", err);
    }
  } else {
    console.log("No slash commands to register.");
  }
});

// interaction (slash) handler
client.on("interactionCreate", async (interaction: Interaction) => {
  try {
    // Only handle chat input (slash) commands here
    if (!interaction.isChatInputCommand?.()) return;

    // Narrow for TypeScript
    const ci = interaction as ChatInputCommandInteraction;

    const module = slashCommands.get(ci.commandName);
    if (!module) {
      // Use the chat-input interaction to reply
      return ci.reply({ content: "Unknown command.", ephemeral: true });
    }

    await module.execute(ci);
  } catch (err) {
    console.error("Slash interaction error:", err);
    // Use safe helper that handles all interaction types
    await safeInteractionReply(interaction, { content: "Internal error while running command.", ephemeral: true });
  }
});

// message-based commands with per-guild prefix
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guild) return; // ignore DMs for message commands

    // fetch guild config (includes prefix)
    const cfg = await getGuildConfig(message.guild.id);
    const prefix = cfg?.prefix ?? "!";

    if (!message.content.startsWith(prefix)) return;

    // strip prefix and normalize to router's expectation (router expects content starting with "!")
    const contentWithoutPrefix = message.content.slice(prefix.length).trim();
    if (!contentWithoutPrefix) return;

    // temporarily set message.content to a "!"-prefixed version so your existing router works unchanged
    const originalContent = message.content;
    try {
      // mutate for compatibility with your router (it reads message.content)
      (message as any).content = "!" + contentWithoutPrefix;
      await routeMessage(client, message);
    } finally {
      // restore original content
      (message as any).content = originalContent;
    }
  } catch (err) {
    console.error("Message handler error:", err);
    try {
      await message.reply("An internal error occurred while processing your command.");
    } catch (replyErr) {
      console.error("Failed to notify user about message handler error:", replyErr);
    }
  }
});

client.login(token);
