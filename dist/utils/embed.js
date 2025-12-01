"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseEmbed = baseEmbed;
exports.infoEmbed = infoEmbed;
exports.successEmbed = successEmbed;
exports.errorEmbed = errorEmbed;
exports.balanceEmbed = balanceEmbed;
// src/utils/embed.ts
const discord_js_1 = require("discord.js");
const format_1 = require("./format");
// ... keep baseEmbed, infoEmbed, successEmbed, errorEmbed as they were ...
function baseEmbed(user) {
    const embed = new discord_js_1.EmbedBuilder()
        .setColor(discord_js_1.Colors.Blurple)
        .setTimestamp()
        .setFooter({ text: "Casino Bot • Play Responsibly" });
    if (user) {
        embed.setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL({ size: 256 })
        });
    }
    return embed;
}
function infoEmbed(user, title, desc) {
    return baseEmbed(user).setTitle(title).setDescription(desc ?? "");
}
function successEmbed(user, title, desc) {
    return baseEmbed(user).setColor(discord_js_1.Colors.Green).setTitle(title).setDescription(desc ?? "");
}
function errorEmbed(user, title, desc) {
    return baseEmbed(user).setColor(discord_js_1.Colors.Red).setTitle(title).setDescription(desc ?? "");
}
// UPDATED: Now accepts 'emoji' string
function balanceEmbed(user, wallet, bank, emoji) {
    return baseEmbed(user)
        .setTitle(`${user.username}'s Balance`)
        .addFields({ name: "Wallet", value: (0, format_1.fmtCurrency)(wallet, emoji), inline: true }, { name: "Bank", value: (0, format_1.fmtCurrency)(bank, emoji), inline: true });
}
//# sourceMappingURL=embed.js.map