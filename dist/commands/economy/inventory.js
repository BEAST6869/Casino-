"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleInventory = handleInventory;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const walletService_1 = require("../../services/walletService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
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
        const emoji = config.currencyEmoji;
        // Fetch Inventory
        const items = await (0, shopService_1.getUserInventory)(targetUser.id, message.guildId);
        if (items.length === 0) {
            const emptyEmbed = new discord_js_1.EmbedBuilder()
                .setTitle(`🎒 ${targetUser.username}'s Inventory`)
                .setColor(discord_js_1.Colors.Blue)
                .setDescription("Your inventory is empty.\nCheck out the store with `!shop`!")
                .setTimestamp();
            return message.reply({ embeds: [emptyEmbed] });
        }
        // Calculate Total Net Worth of items
        const netWorth = items.reduce((sum, slot) => sum + (slot.shopItem.price * slot.amount), 0);
        // Format the list
        // Lists top 15 items to prevent embed overflow (simple version)
        // You can add pagination later if users have tons of unique items
        const displayItems = items.slice(0, 15);
        const description = displayItems.map((slot, index) => {
            const item = slot.shopItem;
            return `**${index + 1}. ${item.name}**\n` +
                `Quantity: \`x${slot.amount}\` • Price: ${(0, format_1.fmtCurrency)(item.price, emoji)}`;
        }).join("\n\n");
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🎒 ${targetUser.username}'s Inventory`)
            .setColor(discord_js_1.Colors.Blue)
            .setDescription(description)
            .setFooter({ text: `Total Value: ${(0, format_1.fmtCurrency)(netWorth, emoji)} ${items.length > 15 ? `• And ${items.length - 15} more...` : ''}` })
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    catch (err) {
        console.error("Inventory Error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to fetch inventory.")] });
    }
}
//# sourceMappingURL=inventory.js.map