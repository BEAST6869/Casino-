"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const walletService_1 = require("../../services/walletService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
const ITEMS_PER_PAGE = 4;
function renderStorePage(items, page, emoji) {
    const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentItems = items.slice(start, end);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Store")
        .setDescription("Click a button below to instantly buy an item, or use the `/shop buy` command.\nFor more details before purchasing, use the `/shop info` command.")
        .setColor(discord_js_1.Colors.DarkGrey)
        .setFooter({ text: `Page ${page}/${totalPages}` });
    const rows = [];
    for (const item of currentItems) {
        const infoBtn = new discord_js_1.ButtonBuilder()
            .setCustomId(`shop_info_${item.id}`)
            .setLabel(item.name.length > 25 ? item.name.substring(0, 22) + "..." : item.name)
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji("❔");
        const buyBtn = new discord_js_1.ButtonBuilder()
            .setCustomId(`shop_buy_${item.id}`)
            .setLabel(item.price.toLocaleString())
            .setStyle(discord_js_1.ButtonStyle.Success);
        try {
            const btnEmoji = emoji.match(/:(\d+)>/)?.[1] ?? (emoji.match(/^\d+$/) ? emoji : "🛒");
            buyBtn.setEmoji(btnEmoji);
        }
        catch {
            buyBtn.setEmoji("🛒");
        }
        rows.push(new discord_js_1.ActionRowBuilder().addComponents(infoBtn, buyBtn));
    }
    const navRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`shop_prev`).setLabel("Previous Page").setStyle(discord_js_1.ButtonStyle.Primary).setDisabled(page <= 1), new discord_js_1.ButtonBuilder().setCustomId(`shop_next`).setLabel("Next Page").setStyle(discord_js_1.ButtonStyle.Primary).setDisabled(page >= totalPages));
    rows.push(navRow);
    return { embed, components: rows, page, totalPages };
}
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("shop")
    .setDescription("Access the server shop")
    .addSubcommand((sub) => sub
    .setName("view")
    .setDescription("View the shop items and buy via buttons"))
    .addSubcommand((sub) => sub
    .setName("buy")
    .setDescription("Buy a specific item by name")
    .addStringOption((opt) => opt.setName("item").setDescription("Name of the item").setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("inventory")
    .setDescription("View your current inventory"));
async function execute(interaction) {
    const config = await (0, guildConfigService_1.getGuildConfig)(interaction.guildId);
    const emoji = config.currencyEmoji;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "buy") {
        const itemName = interaction.options.getString("item", true);
        await interaction.deferReply();
        try {
            await (0, walletService_1.ensureUserAndWallet)(interaction.user.id, interaction.guildId, interaction.user.tag);
            const item = await (0, shopService_1.buyItem)(interaction.guildId, interaction.user.id, itemName);
            if (item.roleId && interaction.guild) {
                const role = interaction.guild.roles.cache.get(item.roleId);
                if (role) {
                    const member = interaction.member;
                    try {
                        await member.roles.add(role);
                    }
                    catch { }
                }
            }
            return interaction.editReply({ embeds: [(0, embed_1.successEmbed)(interaction.user, "Purchase Successful", `You bought **${item.name}**!`)] });
        }
        catch (err) {
            return interaction.editReply({ embeds: [(0, embed_1.errorEmbed)(interaction.user, "Failed", err.message)] });
        }
    }
    if (subcommand === "inventory") {
        await interaction.deferReply();
        const inv = await (0, shopService_1.getUserInventory)(interaction.user.id, interaction.guildId);
        if (inv.length === 0)
            return interaction.editReply("Your inventory is empty.");
        const desc = inv.map(i => `• **${i.shopItem.name}** (x${i.amount})`).join("\n");
        const embed = new discord_js_1.EmbedBuilder().setTitle(`${interaction.user.username}'s Inventory`).setColor(discord_js_1.Colors.Blue).setDescription(desc || "Empty");
        return interaction.editReply({ embeds: [embed] });
    }
    if (subcommand === "view") {
        try {
            await interaction.deferReply();
            const allItems = await (0, shopService_1.getShopItems)(interaction.guildId);
            if (allItems.length === 0) {
                return interaction.editReply({ embeds: [(0, embed_1.errorEmbed)(interaction.user, "Shop Empty", "No items are currently for sale.")] });
            }
            let currentPage = 1;
            const ui = renderStorePage(allItems, currentPage, emoji);
            const sentMessage = await interaction.editReply({ embeds: [ui.embed], components: ui.components });
            const collector = sentMessage.createMessageComponentCollector({
                componentType: discord_js_1.ComponentType.Button,
                time: 120000,
                filter: (i) => i.user.id === interaction.user.id
            });
            collector.on("collect", async (btnInteraction) => {
                if (btnInteraction.customId === "shop_prev") {
                    currentPage--;
                    const newUI = renderStorePage(allItems, currentPage, emoji);
                    await btnInteraction.update({ embeds: [newUI.embed], components: newUI.components });
                    return;
                }
                if (btnInteraction.customId === "shop_next") {
                    currentPage++;
                    const newUI = renderStorePage(allItems, currentPage, emoji);
                    await btnInteraction.update({ embeds: [newUI.embed], components: newUI.components });
                    return;
                }
                if (btnInteraction.customId.startsWith("shop_info_")) {
                    const itemId = btnInteraction.customId.replace("shop_info_", "");
                    const item = allItems.find(i => i.id === itemId);
                    if (item) {
                        const detailEmbed = new discord_js_1.EmbedBuilder()
                            .setTitle(item.name)
                            .setDescription(item.description)
                            .setColor(discord_js_1.Colors.Blurple)
                            .addFields({ name: "Price", value: (0, format_1.fmtCurrency)(item.price, emoji), inline: true }, { name: "Stock", value: item.stock === -1 ? "∞" : item.stock.toString(), inline: true });
                        await btnInteraction.reply({ embeds: [detailEmbed], ephemeral: true });
                    }
                    else {
                        await btnInteraction.reply({ content: "Item not found.", ephemeral: true });
                    }
                    return;
                }
                if (btnInteraction.customId.startsWith("shop_buy_")) {
                    const itemId = btnInteraction.customId.replace("shop_buy_", "");
                    const item = allItems.find(i => i.id === itemId);
                    if (!item) {
                        await btnInteraction.reply({ content: "Item no longer exists.", ephemeral: true });
                        return;
                    }
                    try {
                        await (0, walletService_1.ensureUserAndWallet)(btnInteraction.user.id, btnInteraction.guildId, btnInteraction.user.tag);
                        const bought = await (0, shopService_1.buyItem)(btnInteraction.guildId, btnInteraction.user.id, item.name);
                        if (bought.roleId && btnInteraction.guild) {
                            const role = btnInteraction.guild.roles.cache.get(bought.roleId);
                            if (role) {
                                const member = btnInteraction.member;
                                try {
                                    await member.roles.add(role);
                                }
                                catch (e) {
                                    console.log("Role error", e);
                                }
                            }
                        }
                        await btnInteraction.reply({
                            content: `✅ Successfully purchased **${bought.name}** for **${(0, format_1.fmtCurrency)(bought.price, emoji)}**.`,
                            ephemeral: true
                        });
                    }
                    catch (err) {
                        await btnInteraction.reply({ content: `❌ Purchase failed: ${err.message}`, ephemeral: true });
                    }
                }
            });
            collector.on("end", () => {
                try {
                    const endUI = renderStorePage(allItems, currentPage, emoji);
                    const disabledRows = endUI.components.map(row => {
                        row.components.forEach(btn => btn.setDisabled(true));
                        return row;
                    });
                    sentMessage.edit({ components: disabledRows }).catch(() => { });
                }
                catch { }
            });
        }
        catch (err) {
            console.error("slashShop error:", err);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp("Failed to load shop.");
            }
            else {
                await interaction.reply("Failed to load shop.");
            }
        }
    }
}
//# sourceMappingURL=shop.js.map