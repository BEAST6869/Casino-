"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLeaderboard = handleLeaderboard;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const emojiRegistry_1 = require("../../utils/emojiRegistry");
async function handleLeaderboard(message, args) {
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const eGraph = (0, emojiRegistry_1.emojiInline)("graph", message.guild) || "📈";
    const eWallet = (0, emojiRegistry_1.emojiInline)("Wallet", message.guild) || "👛";
    // Determine type: "cash" or "net" (default)
    const type = args[0]?.toLowerCase() === "cash" ? "cash" : "net";
    // Fetch top 10 users
    // Note: For large scale, you might need a more optimized query or cache
    const users = await prisma_1.default.user.findMany({
        include: { wallet: true, bank: true },
    });
    // Sort logic
    const sorted = users.sort((a, b) => {
        const netA = (a.wallet?.balance ?? 0) + (type === "net" ? (a.bank?.balance ?? 0) : 0);
        const netB = (b.wallet?.balance ?? 0) + (type === "net" ? (b.bank?.balance ?? 0) : 0);
        return netB - netA;
    });
    const top10 = sorted.slice(0, 10);
    const description = top10.map((u, i) => {
        const val = (u.wallet?.balance ?? 0) + (type === "net" ? (u.bank?.balance ?? 0) : 0);
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**${i + 1}.**`;
        return `${medal} **${u.username}** — ${(0, format_1.fmtCurrency)(val, emoji)}`;
    }).join("\n");
    const title = type === "net" ? `${eGraph} Net Worth Leaderboard` : `${eWallet} Cash Leaderboard`;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(title)
        .setColor(discord_js_1.Colors.Gold)
        .setDescription(description || "No users found.")
        .setFooter({ text: "Top 10 Richest Users" });
    // Buttons to toggle view
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("lb_net").setLabel("Net Worth").setStyle(type === "net" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary), new discord_js_1.ButtonBuilder().setCustomId("lb_cash").setLabel("Cash Only").setStyle(type === "cash" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary));
    const sent = await message.reply({ embeds: [embed], components: [row] });
    // Interactive Switching
    const collector = sent.createMessageComponentCollector({ componentType: discord_js_1.ComponentType.Button, time: 60000 });
    collector.on("collect", async (i) => {
        const newType = i.customId === "lb_net" ? "net" : "cash";
        // Re-sort
        const newSorted = users.sort((a, b) => {
            const netA = (a.wallet?.balance ?? 0) + (newType === "net" ? (a.bank?.balance ?? 0) : 0);
            const netB = (b.wallet?.balance ?? 0) + (newType === "net" ? (b.bank?.balance ?? 0) : 0);
            return netB - netA;
        });
        const newTop = newSorted.slice(0, 10);
        const newDesc = newTop.map((u, idx) => {
            const val = (u.wallet?.balance ?? 0) + (newType === "net" ? (u.bank?.balance ?? 0) : 0);
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `**${idx + 1}.**`;
            return `${medal} **${u.username}** — ${(0, format_1.fmtCurrency)(val, emoji)}`;
        }).join("\n");
        const newTitle = newType === "net" ? `${eGraph} Net Worth Leaderboard` : `${eWallet} Cash Leaderboard`;
        embed.setTitle(newTitle).setDescription(newDesc);
        // Update buttons style
        row.components[0].setStyle(newType === "net" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary);
        row.components[1].setStyle(newType === "cash" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary);
        await i.update({ embeds: [embed], components: [row] });
    });
}
//# sourceMappingURL=leaderboard.js.map