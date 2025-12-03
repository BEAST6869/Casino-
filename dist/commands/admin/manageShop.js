"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleManageShop = handleManageShop;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
async function handleManageShop(message, args) {
    // 1. Permission Check
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const searchName = args.join(" ");
    let targetItem;
    // 2. Resolve Target Item (Search or Select)
    if (searchName) {
        // Direct lookup: !manageitem Sword
        targetItem = await (0, shopService_1.getShopItemByName)(message.guildId, searchName);
        if (!targetItem)
            return message.reply("Item not found.");
    }
    else {
        // Dropdown lookup: !manageitem
        const items = await (0, shopService_1.getShopItems)(message.guildId);
        if (items.length === 0)
            return message.reply("Shop is empty.");
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId("manage_select_item")
            .setPlaceholder("Select an item to manage...")
            .addOptions(items.slice(0, 25).map(i => new discord_js_1.StringSelectMenuOptionBuilder()
            .setLabel(i.name)
            .setValue(i.id)
            .setDescription(`${i.price} coins`)));
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        const msg = await message.reply({ content: "Select an item to edit or delete:", components: [row] });
        try {
            const selection = await msg.awaitMessageComponent({
                componentType: discord_js_1.ComponentType.StringSelect,
                time: 60000,
                filter: (i) => i.user.id === message.author.id
            });
            targetItem = items.find(i => i.id === selection.values[0]);
            await selection.deferUpdate(); // Acknowledge selection
        }
        catch {
            return msg.edit({ content: "Timed out.", components: [] });
        }
    }
    if (!targetItem)
        return message.reply("Error finding item.");
    // 3. Render the Control Panel
    const renderPanel = (item) => {
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`⚙️ Managing: ${item.name}`)
            .setColor(discord_js_1.Colors.Orange)
            .addFields({ name: "Name", value: item.name, inline: true }, { name: "Price", value: (0, format_1.fmtCurrency)(item.price, emoji), inline: true }, { name: "Stock", value: item.stock === -1 ? "Infinite" : String(item.stock), inline: true }, { name: "Description", value: item.description || "None", inline: false }, { name: "Role ID", value: item.roleId || "None", inline: false });
        const row1 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("edit_name").setLabel("Name").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("📝"), new discord_js_1.ButtonBuilder().setCustomId("edit_price").setLabel("Price").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("💰"), new discord_js_1.ButtonBuilder().setCustomId("edit_stock").setLabel("Stock").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("📦"), new discord_js_1.ButtonBuilder().setCustomId("edit_desc").setLabel("Desc").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("📜"));
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("btn_delete").setLabel("DELETE ITEM").setStyle(discord_js_1.ButtonStyle.Danger).setEmoji("🗑️"), new discord_js_1.ButtonBuilder().setCustomId("btn_done").setLabel("Done").setStyle(discord_js_1.ButtonStyle.Success));
        return { embeds: [embed], components: [row1, row2] };
    };
    // 4. Send Panel & Start Collector
    const ui = renderPanel(targetItem);
    const panelMsg = await message.reply(ui);
    const collector = panelMsg.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 300000, // 5 mins
        filter: (i) => i.user.id === message.author.id
    });
    collector.on("collect", async (interaction) => {
        if (!targetItem)
            return;
        // --- DELETE Action ---
        if (interaction.customId === "btn_delete") {
            await (0, shopService_1.deleteShopItem)(targetItem.id);
            await interaction.update({ content: `🗑️ **${targetItem.name}** has been deleted.`, embeds: [], components: [] });
            collector.stop();
            return;
        }
        // --- DONE Action ---
        if (interaction.customId === "btn_done") {
            await interaction.update({ components: [] });
            collector.stop();
            return;
        }
        // --- EDIT Actions (Open Modal) ---
        let modalId = "";
        let label = "";
        let fieldId = "";
        let style = discord_js_1.TextInputStyle.Short;
        let currentVal = "";
        switch (interaction.customId) {
            case "edit_name":
                modalId = "modal_name";
                label = "New Name";
                fieldId = "val_name";
                currentVal = targetItem.name;
                break;
            case "edit_price":
                modalId = "modal_price";
                label = "New Price";
                fieldId = "val_price";
                currentVal = String(targetItem.price);
                break;
            case "edit_stock":
                modalId = "modal_stock";
                label = "New Stock (-1 for inf)";
                fieldId = "val_stock";
                currentVal = String(targetItem.stock);
                break;
            case "edit_desc":
                modalId = "modal_desc";
                label = "Description";
                fieldId = "val_desc";
                currentVal = targetItem.description;
                style = discord_js_1.TextInputStyle.Paragraph;
                break;
        }
        if (modalId) {
            const modal = new discord_js_1.ModalBuilder().setCustomId(modalId).setTitle(`Edit ${targetItem.name}`);
            const input = new discord_js_1.TextInputBuilder().setCustomId(fieldId).setLabel(label).setStyle(style).setValue(currentVal).setRequired(true);
            modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
            try {
                // Wait for Modal Submit
                const submission = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: (i) => i.user.id === message.author.id
                });
                const newValue = submission.fields.getTextInputValue(fieldId);
                const updates = {};
                // Validate Inputs
                if (modalId === "modal_name")
                    updates.name = newValue;
                if (modalId === "modal_desc")
                    updates.description = newValue;
                if (modalId === "modal_price") {
                    const p = parseInt(newValue);
                    if (isNaN(p) || p < 0) {
                        await submission.reply({ content: "Invalid price", ephemeral: true });
                        return;
                    }
                    updates.price = p;
                }
                if (modalId === "modal_stock") {
                    const s = parseInt(newValue);
                    if (isNaN(s)) {
                        await submission.reply({ content: "Invalid stock", ephemeral: true });
                        return;
                    }
                    updates.stock = s;
                }
                // Update Database
                targetItem = await (0, shopService_1.updateShopItem)(message.guildId, targetItem.id, updates);
                // Refresh Panel (Using edit instead of update to be safe)
                await submission.deferUpdate();
                await panelMsg.edit(renderPanel(targetItem));
            }
            catch (e) {
                // Modal timed out or cancelled
            }
        }
    });
    collector.on("end", () => {
        if (panelMsg.editable)
            panelMsg.edit({ components: [] }).catch(() => { });
    });
}
//# sourceMappingURL=manageShop.js.map