"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleChicken = handleChicken;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const guildConfigService_1 = require("../../services/guildConfigService");
async function handleChicken(message, args) {
    const subCommand = args[0]?.toLowerCase();
    if (subCommand === "name") {
        return handleName(message, args.slice(1));
    }
    if (subCommand === "top" || subCommand === "leaderboard") {
        return handleTop(message);
    }
    return handleView(message, args);
}
async function handleTop(message) {
    const guildId = message.guildId;
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    const shopItem = await prisma_1.default.shopItem.findFirst({
        where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
    });
    if (!shopItem)
        return message.reply("Chicken item not configured in shop.");
    const chickens = await prisma_1.default.inventory.findMany({
        where: {
            shopItemId: shopItem.id,
            amount: { gte: 1 }
        },
        include: { user: true }
    });
    if (chickens.length === 0) {
        return message.reply("No chickens found on the leaderboard!");
    }
    const sorted = chickens.sort((a, b) => {
        const metaA = a.meta || {};
        const metaB = b.meta || {};
        const levelA = metaA.level || 0;
        const levelB = metaB.level || 0;
        const xpA = metaA.xp || 0;
        const xpB = metaB.xp || 0;
        if (levelA !== levelB)
            return levelB - levelA;
        return xpB - xpA;
    });
    const top10 = sorted.slice(0, 10);
    const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
    const EMOJI_TROPHY = "<:cock:1451281426329768172>";
    const description = top10.map((inv, index) => {
        const meta = inv.meta || {};
        const level = meta.level || 0;
        const wins = meta.wins || 0;
        const name = meta.name ? `"${meta.name}"` : "Chicken";
        let rankEmoji = `#${index + 1}`;
        if (index === 0)
            rankEmoji = "<a:medal1:1445694263957520445>";
        if (index === 1)
            rankEmoji = "<:medal2:1445694331393675306>";
        if (index === 2)
            rankEmoji = "<:medal3:1445694562914799616>";
        return `${rankEmoji} **${inv.user.username}** — ${name} (Lvl ${level} | ${wins} Wins)`;
    }).join("\n");
    const embed = new discord_js_1.EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${EMOJI_TROPHY} Chicken Leaderboard`)
        .setDescription(description || "No active chickens.")
        .setFooter({ text: `Use ${config.prefix}chicken top to see this list.` });
    return message.reply({ embeds: [embed] });
}
async function handleName(message, args) {
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    if (args.length < 1) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}chicken name <New Name>\``)] });
    }
    const newName = args.join(" ");
    if (newName.length > 30) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Name Too Long", "Chicken names must be under 30 characters.")] });
    }
    const guildId = message.guildId;
    const user = message.author;
    const shopItem = await prisma_1.default.shopItem.findFirst({
        where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
    });
    if (!shopItem)
        return message.reply("Chicken item not configured in shop.");
    const userDb = await prisma_1.default.user.findFirst({ where: { discordId: user.id, guildId } });
    if (!userDb)
        return message.reply("User not found.");
    const inventoryItem = await prisma_1.default.inventory.findUnique({
        where: { userId_shopItemId: { userId: userDb.id, shopItemId: shopItem.id } }
    });
    if (!inventoryItem || inventoryItem.amount < 1) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "No Chicken", "You need a chicken to name it!")] });
    }
    const meta = inventoryItem.meta || {};
    meta.name = newName;
    await prisma_1.default.inventory.update({
        where: { id: inventoryItem.id },
        data: { meta }
    });
    const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
    const embed = new discord_js_1.EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${EMOJI_CHICKEN} Chicken Renamed!`)
        .setDescription(`Your chicken has been renamed to **${newName}**!`)
        .setFooter({ text: "May it fight with honor!" });
    return message.reply({ embeds: [embed] });
}
async function handleView(message, args) {
    const user = message.author;
    const guildId = message.guildId;
    if (!guildId)
        return;
    try {
        const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
        const userData = await prisma_1.default.user.findUnique({
            where: { discordId_guildId: { discordId: user.id, guildId } }
        });
        if (!userData) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "Error", "User not found.")] });
        }
        const shopItem = await prisma_1.default.shopItem.findFirst({
            where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
        });
        if (!shopItem) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "Error", "The 'Chicken' item does not exist in the shop.")] });
        }
        const inventoryItem = await prisma_1.default.inventory.findUnique({
            where: { userId_shopItemId: { userId: userData.id, shopItemId: shopItem.id } }
        });
        if (!inventoryItem) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(user, "No Chicken", "You do not own a chicken! Buy one from the shop.")]
            });
        }
        const meta = inventoryItem.meta || {};
        const level = meta.level || 0;
        const wins = meta.wins || 0;
        const xp = meta.xp || 0;
        const chickenName = meta.name || `${user.username}'s Chicken`;
        const score = 10 + (level * 2);
        const EMOJI_XP = "<:xpfull:1451636569982111765>";
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const requiredXp = (level + 1) * 100;
        const filledBars = Math.floor((xp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;
        const getWinChance = (enemyLevel) => {
            const enemyScore = 10 + (enemyLevel * 2);
            return ((score / (score + enemyScore)) * 100).toFixed(1);
        };
        const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("#FFD700")
            .setTitle(`${EMOJI_CHICKEN} ${chickenName}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`**Level ${level}** Battle Chicken`)
            .addFields({ name: "Name", value: chickenName, inline: true }, { name: "XP", value: `${progressBar} ${xp}/${requiredXp}`, inline: true }, { name: "Wins", value: `${wins}`, inline: true }, {
            name: "Win Probabilities (Est.)", value: `
Vs Lvl 0: **${getWinChance(0)}%**
Vs Lvl 5: **${getWinChance(5)}%**
Vs Lvl 10: **${getWinChance(10)}%**
                `, inline: false
        })
            .setFooter({ text: `Use ${config.prefix}chicken name <name> to rename!` });
        return message.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error("Chicken Command Error:", error);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "System Error", "An error occurred while fetching chicken stats.")] });
    }
}
//# sourceMappingURL=chicken.js.map