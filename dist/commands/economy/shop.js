"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleShop = handleShop;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const walletService_1 = require("../../services/walletService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
// Layout: Items listed in Embed Text.
// Interaction: Numbered buttons (1-5) below to buy.
const ITEMS_PER_PAGE = 5;
// Helper: Render the Shop Page
function renderShopPage(items, page, totalPages, currencyEmoji) {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const currentItems = items.slice(start, start + ITEMS_PER_PAGE);
    // 1. EMBED: List items with numbers
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Store")
        .setColor(discord_js_1.Colors.DarkGrey)
        .setFooter({ text: `Page ${page}/${totalPages} • Click the numbered button to buy` });
    if (currentItems.length > 0) {
        const description = currentItems.map((item, index) => {
            // "1. ItemName — Price"
            return `**${index + 1}. ${item.name}** — ${(0, format_1.fmtCurrency)(item.price, currencyEmoji)}\n*${item.description || "No description"}*`;
        }).join("\n\n");
        embed.setDescription(description);
    }
    else {
        embed.setDescription("No items available.");
    }
    // 2. BUY BUTTONS (Row 1)
    const buyRow = new discord_js_1.ActionRowBuilder();
    currentItems.forEach((item, index) => {
        buyRow.addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`shop_buy_${item.id}`)
            .setLabel(`${index + 1}`) // 1, 2, 3, 4, 5
            .setStyle(discord_js_1.ButtonStyle.Success) // Green
            .setEmoji("🛒"));
    });
    // 3. NAVIGATION (Row 2)
    const navRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("shop_prev").setLabel("Previous").setStyle(discord_js_1.ButtonStyle.Secondary).setDisabled(page <= 1), new discord_js_1.ButtonBuilder().setCustomId("shop_next").setLabel("Next").setStyle(discord_js_1.ButtonStyle.Secondary).setDisabled(page >= totalPages));
    // Return components (Buy row only if items exist)
    const components = currentItems.length > 0 ? [buyRow, navRow] : [navRow];
    return { embed, components };
}
// --- Main Command Handler ---
async function handleShop(message, args) {
    try {
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
        const emoji = config.currencyEmoji;
        const sub = args[0]?.toLowerCase();
        // Subcommand: !shop buy <item>
        if (sub === "buy") {
            const itemName = args.slice(1).join(" ");
            if (!itemName)
                return message.reply("Usage: `!shop buy <item name>`");
            try {
                await (0, walletService_1.ensureUserAndWallet)(message.author.id, message.author.tag);
                const item = await (0, shopService_1.buyItem)(message.guildId, message.author.id, itemName);
                if (item.roleId && message.guild) {
                    const role = message.guild.roles.cache.get(item.roleId);
                    if (role)
                        try {
                            await message.member?.roles.add(role);
                        }
                        catch { }
                }
                return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Purchase Successful", `You bought **${item.name}**!`)] });
            }
            catch (err) {
                return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Failed", err.message)] });
            }
        }
        // Subcommand: !shop inv
        if (sub === "inv" || sub === "inventory") {
            const inv = await (0, shopService_1.getUserInventory)(message.author.id, message.guildId);
            if (inv.length === 0)
                return message.reply("Your inventory is empty.");
            const desc = inv.map(i => `• **${i.shopItem.name}** (x${i.amount})`).join("\n");
            const embed = new discord_js_1.EmbedBuilder().setTitle(`${message.author.username}'s Inventory`).setColor(discord_js_1.Colors.Blue).setDescription(desc || "Empty");
            return message.reply({ embeds: [embed] });
        }
        // Main Dashboard
        const allItems = await (0, shopService_1.getShopItems)(message.guildId);
        if (allItems.length === 0) {
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Shop Empty", "No items are currently for sale.")] });
        }
        let currentPage = 1;
        const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
        const ui = renderShopPage(allItems, currentPage, totalPages, emoji);
        const sentMessage = await message.reply({ embeds: [ui.embed], components: ui.components });
        const collector = sentMessage.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 120000,
            filter: (i) => i.user.id === message.author.id
        });
        collector.on("collect", async (interaction) => {
            // Navigation
            if (interaction.customId === "shop_prev") {
                currentPage--;
                const newUI = renderShopPage(allItems, currentPage, totalPages, emoji);
                await interaction.update({ embeds: [newUI.embed], components: newUI.components });
                return;
            }
            if (interaction.customId === "shop_next") {
                currentPage++;
                const newUI = renderShopPage(allItems, currentPage, totalPages, emoji);
                await interaction.update({ embeds: [newUI.embed], components: newUI.components });
                return;
            }
            // Buy Button
            if (interaction.customId.startsWith("shop_buy_")) {
                const itemId = interaction.customId.replace("shop_buy_", "");
                const item = allItems.find(i => i.id === itemId);
                if (!item) {
                    await interaction.reply({ content: "Item not found.", ephemeral: true });
                    return;
                }
                try {
                    await (0, walletService_1.ensureUserAndWallet)(interaction.user.id, interaction.user.tag);
                    const bought = await (0, shopService_1.buyItem)(interaction.guildId, interaction.user.id, item.name);
                    if (bought.roleId && interaction.guild) {
                        const role = interaction.guild.roles.cache.get(bought.roleId);
                        if (role) {
                            const member = interaction.member;
                            try {
                                await member.roles.add(role);
                            }
                            catch (e) { }
                        }
                    }
                    await interaction.reply({
                        content: `✅ Purchased **${bought.name}** for **${(0, format_1.fmtCurrency)(bought.price, emoji)}**!`,
                        ephemeral: true
                    });
                }
                catch (err) {
                    await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
                }
            }
        });
        collector.on("end", () => {
            try {
                // Safe reconstruction to disable buttons
                const finalUI = renderShopPage(allItems, currentPage, totalPages, emoji);
                finalUI.components.forEach(row => {
                    row.components.forEach(btn => btn.setDisabled(true));
                });
                sentMessage.edit({ components: finalUI.components }).catch(() => { });
            }
            catch { }
        });
    }
    catch (err) {
        console.error("handleShop error:", err);
        try {
            await message.reply("Failed to load shop.");
        }
        catch { }
    }
}
//# sourceMappingURL=shop.js.map