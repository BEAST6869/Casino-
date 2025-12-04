"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInventory = handleInventory;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const walletService_1 = require("../../services/walletService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
const emojiRegistry_1 = require("../../utils/emojiRegistry");
async function handleInventory(message, args) {
    try {
        // Allow checking other users: !inv @user
        let targetUser = message.mentions.users.first() || message.author;
        if (targetUser.bot) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Bots cannot hold items.")] });
        }
        // Ensure the target user exists in DB
        await (0, walletService_1.ensureUserAndWallet)(targetUser.id, targetUser.tag);
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        let emoji = config.currencyEmoji;
        // FIX: Emoji Resolution Logic
        // 1. If it's a raw numeric ID, try to resolve it to a full emoji string.
        if (/^\d+$/.test(emoji)) {
            const resolved = message.guild?.emojis.cache.get(emoji);
            if (resolved) {
                emoji = resolved.toString();
            }
            else {
                // If ID is valid but not found in this server (and not cached), 
                // we fallback to a generic symbol to prevent showing a raw number string.
                emoji = "💰";
            }
        }
        // 2. If it is already a full string <...> but renders as text, the bot lacks permission/access.
        // We cannot fix that via code, the admin must set a valid emoji the bot can "see".
        // Get inventory emoji
        const eInv = (0, emojiRegistry_1.emojiInline)("inventory", message.guild) || "🎒";
        // Fetch Inventory
        const items = await (0, shopService_1.getUserInventory)(targetUser.id, message.guildId);
        if (items.length === 0) {
            const emptyEmbed = new discord_js_1.EmbedBuilder()
                .setTitle(`${eInv} ${targetUser.username}'s Inventory`)
                .setColor(discord_js_1.Colors.Blue)
                .setDescription("Your inventory is empty.\nCheck out the store with `!shop`!")
                .setTimestamp();
            return message.reply({ embeds: [emptyEmbed] });
        }
        // Calculate Total Net Worth of items
        const netWorth = items.reduce((sum, slot) => {
            return sum + (slot.shopItem.price * slot.amount);
        }, 0);
        // Format the list
        const displayItems = items.slice(0, 15);
        const description = displayItems.map((slot, index) => {
            const item = slot.shopItem;
            return `**${index + 1}. ${item.name}**\n` +
                `Quantity: \`x${slot.amount}\` • Price: ${(0, format_1.fmtCurrency)(item.price, emoji)}`;
        }).join("\n\n");
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`${eInv} ${targetUser.username}'s Inventory`)
            .setColor(discord_js_1.Colors.Blue)
            .setDescription(description)
            // Moved "Total Value" to a Field for better visibility and emoji support reliability
            .addFields({
            name: " Total Value",
            value: (0, format_1.fmtCurrency)(netWorth, emoji),
            inline: false
        })
            .setFooter({ text: items.length > 15 ? `...and ${items.length - 15} more items` : "Page 1" })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    catch (err) {
        console.error("Inventory Error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to fetch inventory.")] });
    }
}
//# sourceMappingURL=inventory.js.map