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
// UPDATED: Now accepts limits
function balanceEmbed(user, wallet, bank, emoji, walletLimit, bankLimit) {
    const formatField = (amount, limit) => {
        const amtStr = (0, format_1.fmtCurrency)(amount, emoji);
        if (limit) {
            return `${amtStr} / ${(0, format_1.fmtCurrency)(limit, emoji)}`;
        }
        return amtStr;
    };
    return baseEmbed(user)
        .setTitle(`${user.username}'s Balance`)
        .addFields({ name: "Wallet", value: formatField(wallet, walletLimit), inline: true }, { name: "Bank", value: formatField(bank, bankLimit), inline: true });
}
//# sourceMappingURL=embed.js.map