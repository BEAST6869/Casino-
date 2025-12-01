"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/registerSlashCommands.ts
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const discord_js_1 = require("discord.js");
const v10_1 = require("discord-api-types/v10");
// adjust these env vars
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID; // your bot application client id
const guildId = process.env.GUILD_ID; // put a test guild id for quick deploy
if (!token || !clientId || !guildId) {
    console.error("DISCORD_TOKEN, CLIENT_ID and GUILD_ID must be set in .env");
    process.exit(1);
}
// load commands from src/commands/slash
const commandsDir = path_1.default.join(__dirname, "commands", "slash");
const commandFiles = fs_1.default.readdirSync(commandsDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
const commands = [];
for (const file of commandFiles) {
    const modulePath = path_1.default.join(commandsDir, file);
    // dynamic import to support ts-node when running with ts-node/register
    // NOTE: when compiled to JS, this will work too.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cmd = require(modulePath);
    if (cmd && cmd.data) {
        commands.push(cmd.data.toJSON());
    }
}
const rest = new discord_js_1.REST({ version: "10" }).setToken(token);
(async () => {
    try {
        console.log(`Started registering ${commands.length} commands to guild ${guildId}...`);
        await rest.put(v10_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log("Successfully registered slash commands (guild).");
    }
    catch (err) {
        console.error("Failed registering commands:", err);
    }
})();
//# sourceMappingURL=registerSlashCommands.js.map