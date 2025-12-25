"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFeed = handleFeed;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const EMOJI_XP = "<:xpfull:1451636569982111765>";
const XP_PER_FEED = 10;
async function handleFeed(message, args) {
    const user = message.author;
    const guildId = message.guildId;
    if (!guildId)
        return;
    try {
        const userData = await prisma_1.default.user.findUnique({
            where: { discordId_guildId: { discordId: user.id, guildId } }
        });
        if (!userData) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "Error", "User not found.")] });
        }
        // 1. Check for 'Chicken'
        const chickenItem = await prisma_1.default.shopItem.findFirst({
            where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
        });
        if (!chickenItem) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "Error", "The 'Chicken' item does not exist in the shop.")] });
        }
        const chickenInventory = await prisma_1.default.inventory.findUnique({
            where: { userId_shopItemId: { userId: userData.id, shopItemId: chickenItem.id } }
        });
        if (!chickenInventory) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(user, "No Chicken", "You don't have a chicken to feed!")]
            });
        }
        // 2. Check for 'Chicken Feed'
        const feedItem = await prisma_1.default.shopItem.findFirst({
            where: {
                name: { in: ["Chicken Feed", "Chicken-Feed"], mode: "insensitive" },
                guildId
            }
        });
        if (!feedItem) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "System Error", "The 'Chicken Feed' item is not configured in the shop.")] });
        }
        const feedInventory = await prisma_1.default.inventory.findUnique({
            where: { userId_shopItemId: { userId: userData.id, shopItemId: feedItem.id } }
        });
        // Parse Amount
        let amount = 1;
        if (args.length > 0) {
            const parsed = parseInt(args[0]);
            if (!isNaN(parsed) && parsed > 0) {
                amount = parsed;
            }
            else if (args[0].toLowerCase() === "all" || args[0].toLowerCase() === "max") {
                amount = feedInventory ? feedInventory.amount : 0;
            }
        }
        // 3. Process Feed
        if (!feedInventory || feedInventory.amount < amount) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(user, "Not Enough Food", `You don't have enough Chicken Feed to feed **${amount}x**! You have: ${feedInventory?.amount || 0}`)]
            });
        }
        // Deduct Feed
        if (feedInventory.amount > amount) {
            await prisma_1.default.inventory.update({
                where: { id: feedInventory.id },
                data: { amount: { decrement: amount } }
            });
        }
        else {
            await prisma_1.default.inventory.delete({
                where: { id: feedInventory.id }
            });
        }
        // Calculate XP logic
        const meta = chickenInventory.meta || {};
        let level = meta.level || 0;
        let xp = meta.xp || 0;
        let wins = meta.wins || 0;
        let xpAdded = XP_PER_FEED * amount;
        xp += xpAdded;
        // Level Up Loop
        let leveledUp = false;
        let levelsGained = 0;
        let requiredXp = (level + 1) * 100;
        while (xp >= requiredXp) {
            xp -= requiredXp;
            level++;
            levelsGained++;
            leveledUp = true;
            requiredXp = (level + 1) * 100;
        }
        // Update Chicken
        await prisma_1.default.inventory.update({
            where: { id: chickenInventory.id },
            data: {
                meta: {
                    level,
                    xp,
                    wins
                }
            }
        });
        // Generate Bar
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const filledBars = Math.floor((xp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("#00FF00")
            .setTitle(`<:cock:1451281426329768172> Yummy!`)
            .setDescription(`You fed your chicken **${amount}x** items! It looks happier.\n\n**+${xpAdded} XP**`)
            .addFields({ name: "Level", value: `${level}`, inline: true }, { name: "XP Progress", value: `${progressBar} (${xp}/${requiredXp})`, inline: false });
        if (leveledUp) {
            embed.addFields({ name: "🎉 LEVEL UP!", value: `Your chicken is now **Level ${level}**! (Gained +${levelsGained} levels)`, inline: false });
        }
        return message.reply({ embeds: [embed] });
    }
    catch (e) {
        console.error(e);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(user, "Error", "Something went wrong feeding your chicken.")] });
    }
}
//# sourceMappingURL=feed.js.map