"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleShop = handleShop;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const walletService_1 = require("../../services/walletService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
async function handleShop(message, args) {
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const sub = args[0]?.toLowerCase();
    // !shop buy <item name>
    if (sub === "buy") {
        const itemName = args.slice(1).join(" ");
        if (!itemName)
            return message.reply("Usage: `!shop buy <item name>`");
        try {
            await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
            const item = await (0, shopService_1.buyItem)(message.guildId, message.author.id, itemName);
            // If item has a role, try to give it (simple implementation)
            if (item.roleId) {
                const role = message.guild?.roles.cache.get(item.roleId);
                if (role) {
                    try {
                        await message.member?.roles.add(role);
                    }
                    catch (e) {
                        console.log("Failed to give role:", e);
                        // Don't fail the purchase just because role failed, but maybe warn
                    }
                }
            }
            return message.reply({
                embeds: [(0, embed_1.successEmbed)(message.author, "Purchase Successful", `You bought **${item.name}** for **${(0, format_1.fmtCurrency)(item.price, emoji)}**!`)]
            });
        }
        catch (err) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Transaction Failed", err.message)] });
        }
    }
    // !shop inv / !inventory
    if (sub === "inv" || sub === "inventory") {
        const inv = await (0, shopService_1.getUserInventory)(message.author.id, message.guildId);
        if (inv.length === 0)
            return message.reply("Your inventory is empty.");
        const desc = inv.map(i => `**${i.shopItem.name}** x${i.amount}`).join("\n");
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`${message.author.username}'s Inventory`)
            .setColor(discord_js_1.Colors.Blue)
            .setDescription(desc);
        return message.reply({ embeds: [embed] });
    }
    // Default: List Items (!shop)
    const items = await (0, shopService_1.getShopItems)(message.guildId);
    if (items.length === 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Shop Empty", "No items are currently for sale.")] });
    }
    const desc = items.map(i => {
        return `**${i.name}** — ${(0, format_1.fmtCurrency)(i.price, emoji)}\n*${i.description}*`;
    }).join("\n\n");
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`🛒 Server Shop`)
        .setColor(discord_js_1.Colors.Gold)
        .setDescription(desc)
        .setFooter({ text: `Type ${config.prefix}shop buy <name> to purchase` });
    return message.reply({ embeds: [embed] });
}
//# sourceMappingURL=shop.js.map