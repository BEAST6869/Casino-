"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetGameCooldown = handleSetGameCooldown;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleSetGameCooldown(message, args) {
    if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "You need Administrator permissions.")] });
    }
    const game = args[0]?.toLowerCase(); // e.g. "slots", "bj"
    const timeInput = args.slice(1).join(" ");
    if (!game || !timeInput) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Usage", "`!set-game-cooldown <game> <time>`\nExample: `!game-cd slots 30s` or `!game-cd bj 1h 30m`")]
        });
    }
    const seconds = (0, format_1.parseDuration)(timeInput);
    if (seconds === null || seconds < 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Time", "Please provide a valid duration (e.g. `30s`, `1m`, `1h`).")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    // Cast to Record<string, number> because Prisma JSON is flexible
    let cooldowns = config.gameCooldowns || {};
    if (typeof cooldowns !== "object")
        cooldowns = {}; // Safety check
    // Update specific game
    cooldowns[game] = seconds;
    await (0, guildConfigService_1.updateGuildConfig)(message.guildId, {
        gameCooldowns: cooldowns
    });
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Configuration Updated", `🕐 **${game.toUpperCase()}** cooldown set to **${(0, format_1.formatDuration)(seconds * 1000)}**.`)]
    });
}
//# sourceMappingURL=setGameCooldown.js.map