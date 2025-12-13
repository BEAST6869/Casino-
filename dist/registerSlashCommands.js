"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const discord_js_1 = require("discord.js");
const v10_1 = require("discord-api-types/v10");
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
if (!token || !clientId || !guildId) {
    console.error("DISCORD_TOKEN, CLIENT_ID and GUILD_ID must be set in .env");
    process.exit(1);
}
const commandsDir = path_1.default.join(__dirname, "commands", "slash");
const commandFiles = fs_1.default.readdirSync(commandsDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
const commands = [];
for (const file of commandFiles) {
    const modulePath = path_1.default.join(commandsDir, file);
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