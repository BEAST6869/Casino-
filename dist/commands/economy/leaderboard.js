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
    const eGraphRaw = (0, emojiRegistry_1.emojiInline)("graph", message.guild) || "📈";
    const eWalletRaw = (0, emojiRegistry_1.emojiInline)("wallet", message.guild) || "👛";
    const eMedal1 = (0, emojiRegistry_1.emojiInline)("medal1", message.guild) || "🥇";
    const eMedal2 = (0, emojiRegistry_1.emojiInline)("medal2", message.guild) || "🥈";
    const eMedal3 = (0, emojiRegistry_1.emojiInline)("medal3", message.guild) || "🥉";
    const parseBtnEmoji = (raw) => raw.match(/:(\d+)>/)?.[1] ?? (raw.match(/^\d+$/) ? raw : raw);
    const btnGraph = parseBtnEmoji(eGraphRaw);
    const btnWallet = parseBtnEmoji(eWalletRaw);
    let initialType = "net";
    if (args[0]?.toLowerCase() === "cash")
        initialType = "cash";
    if (args[0]?.toLowerCase() === "level" || args[0]?.toLowerCase() === "xp")
        initialType = "level";
    let currentType = initialType;
    const users = await prisma_1.default.user.findMany({
        include: { wallet: true, bank: true },
    });
    const getSorted = (t) => {
        return [...users].sort((a, b) => {
            if (t === "level") {
                if (b.level !== a.level)
                    return b.level - a.level;
                return b.xp - a.xp;
            }
            const netA = (a.wallet?.balance ?? 0) + (t === "net" ? (a.bank?.balance ?? 0) : 0);
            const netB = (b.wallet?.balance ?? 0) + (t === "net" ? (b.bank?.balance ?? 0) : 0);
            return netB - netA;
        });
    };
    const getEmbedData = (t, sortedUsers) => {
        const top10 = sortedUsers.slice(0, 10);
        const desc = top10.map((u, i) => {
            let valStr = "";
            if (t === "level") {
                valStr = `Level ${u.level} (${(0, format_1.fmtAmount)(u.xp)} XP)`;
            }
            else {
                const val = (u.wallet?.balance ?? 0) + (t === "net" ? (u.bank?.balance ?? 0) : 0);
                valStr = (0, format_1.fmtCurrency)(val, emoji);
            }
            let rankDisplay = `**${i + 1}.**`;
            if (i === 0)
                rankDisplay = eMedal1;
            if (i === 1)
                rankDisplay = eMedal2;
            if (i === 2)
                rankDisplay = eMedal3;
            return `${rankDisplay} **${u.username}** — ${valStr}`;
        }).join("\n");
        let title = "";
        if (t === "net")
            title = `${eGraphRaw} Net Worth Leaderboard`;
        else if (t === "cash")
            title = `${eWalletRaw} Cash Leaderboard`;
        else
            title = `⭐ Level Leaderboard`;
        return { title, desc, topUsers: top10 };
    };
    const initialSorted = getSorted(currentType);
    const { title, desc } = getEmbedData(currentType, initialSorted);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(title)
        .setColor(discord_js_1.Colors.Gold)
        .setDescription(desc || "No users found.")
        .setFooter({ text: "Top 10 Leaders" });
    const getButtons = (activeType) => {
        const bNet = new discord_js_1.ButtonBuilder().setCustomId("lb_net").setLabel("Net Worth").setStyle(activeType === "net" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary);
        const bCash = new discord_js_1.ButtonBuilder().setCustomId("lb_cash").setLabel("Cash Only").setStyle(activeType === "cash" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary);
        const bLevel = new discord_js_1.ButtonBuilder().setCustomId("lb_level").setLabel("Levels").setStyle(activeType === "level" ? discord_js_1.ButtonStyle.Primary : discord_js_1.ButtonStyle.Secondary);
        try {
            bNet.setEmoji(btnGraph);
        }
        catch {
            bNet.setEmoji("📈");
        }
        try {
            bCash.setEmoji(btnWallet);
        }
        catch {
            bCash.setEmoji("👛");
        }
        try {
            bLevel.setEmoji("⭐");
        }
        catch { }
        return new discord_js_1.ActionRowBuilder().addComponents(bNet, bCash, bLevel);
    };
    const sent = await message.reply({ embeds: [embed], components: [getButtons(currentType)] });
    const collector = sent.createMessageComponentCollector({ componentType: discord_js_1.ComponentType.Button, time: 60000 });
    collector.on("collect", async (i) => {
        if (i.customId === "lb_net")
            currentType = "net";
        if (i.customId === "lb_cash")
            currentType = "cash";
        if (i.customId === "lb_level")
            currentType = "level";
        const newSorted = getSorted(currentType);
        const { title: newTitle, desc: newDesc } = getEmbedData(currentType, newSorted);
        embed.setTitle(newTitle).setDescription(newDesc);
        await i.update({ embeds: [embed], components: [getButtons(currentType)] });
    });
    collector.on("end", () => {
        try {
            const disabledRow = getButtons(currentType);
            disabledRow.components.forEach(c => c.setDisabled(true));
            sent.edit({ components: [disabledRow] }).catch(() => { });
        }
        catch { }
    });
}
//# sourceMappingURL=leaderboard.js.map