"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logToChannel = logToChannel;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../services/guildConfigService");
async function logToChannel(client, options) {
    try {
        const config = await (0, guildConfigService_1.getGuildConfig)(options.guild.id);
        if (!config.logChannelId)
            return;
        const channel = await client.channels.fetch(config.logChannelId);
        if (!channel || !channel.isTextBased())
            return;
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📜 ${options.type}: ${options.title}`)
            .setDescription(options.description)
            .setColor(options.color || discord_js_1.Colors.Blue)
            .setTimestamp()
            .setFooter({ text: "Casino Audit Log" });
        if (options.fields) {
            embed.addFields(options.fields);
        }
        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }
        if (!options.color) {
            switch (options.type) {
                case "ADMIN":
                    embed.setColor(discord_js_1.Colors.Red);
                    break;
                case "ECONOMY":
                    embed.setColor(discord_js_1.Colors.Green);
                    break;
                case "MARKET":
                    embed.setColor(discord_js_1.Colors.Gold);
                    break;
                case "TRADE":
                    embed.setColor(discord_js_1.Colors.Aqua);
                    break;
                case "MODERATION":
                    embed.setColor(discord_js_1.Colors.DarkOrange);
                    break;
            }
        }
        await channel.send({ embeds: [embed] }).catch(() => { });
    }
    catch (err) {
        console.error("Failed to send audit log:", err);
    }
}
//# sourceMappingURL=discordLogger.js.map