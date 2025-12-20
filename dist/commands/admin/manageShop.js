"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleManageShop = handleManageShop;
const discord_js_1 = require("discord.js");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
const permissionUtils_1 = require("../../utils/permissionUtils");
const duration_1 = require("../../utils/duration");
async function handleManageShop(message, args) {
    if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins or Bot Commanders only.")] });
    }
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const emoji = config.currencyEmoji;
    const searchName = args.join(" ");
    let targetItem;
    if (searchName) {
        targetItem = await (0, shopService_1.getShopItemByName)(message.guildId, searchName);
        if (!targetItem)
            return message.reply("Item not found.");
    }
    else {
        const items = await (0, shopService_1.getShopItems)(message.guildId);
        if (items.length === 0)
            return message.reply("Shop is empty.");
        // Select item
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
            await selection.deferUpdate();
        }
        catch {
            return msg.edit({ content: "Timed out.", components: [] });
        }
    }
    if (!targetItem)
        return message.reply("Error finding item.");
    // State Management
    let view = "MAIN";
    const renderPanel = (item, currentView) => {
        if (currentView === "EFFECTS") {
            const effects = item.effects || [];
            const desc = effects.length > 0
                ? effects.map((e, i) => `**${i + 1}. ${e.type}**\n${formatEffectDetails(e)}`).join("\n\n")
                : "No effects configured.";
            const embed = new discord_js_1.EmbedBuilder()
                .setTitle(`✨ Effects: ${item.name}`)
                .setColor(discord_js_1.Colors.Purple)
                .setDescription(desc);
            const row1 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("btn_add_effect").setLabel("Add Effect").setStyle(discord_js_1.ButtonStyle.Success).setEmoji("➕"), new discord_js_1.ButtonBuilder().setCustomId("btn_clear_effects").setLabel("Clear All").setStyle(discord_js_1.ButtonStyle.Danger).setEmoji("<a:Delete:1449708417890386062>"), new discord_js_1.ButtonBuilder().setCustomId("btn_back").setLabel("Back").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("↩️"));
            return { embeds: [embed], components: [row1] };
        }
        // MAIN View
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`<a:setting:1445732449010319433> Managing: ${item.name}`)
            .setColor(discord_js_1.Colors.Orange)
            .addFields({ name: "<:pencill:1449707576475521102> Name", value: item.name, inline: true }, { name: "<:pricee:1449707707442528387> Price", value: (0, format_1.fmtCurrency)(item.price, emoji), inline: true }, { name: "<a:BoxBox:1449707866079494154> Stock", value: item.stock === -1 ? "Infinite" : String(item.stock), inline: true }, { name: "<:scrolll:1446218234171887760> Description", value: item.description || "None", inline: false }, { name: "Role ID (Legacy)", value: item.roleId || "None", inline: false }, { name: "<:sparks:1449708086099968031> Effects", value: `${(item.effects || []).length} active effects`, inline: false });
        const row1 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("edit_name").setLabel("Name").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("<:pencill:1449707576475521102>"), new discord_js_1.ButtonBuilder().setCustomId("edit_price").setLabel("Price").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("<:pricee:1449707707442528387>"), new discord_js_1.ButtonBuilder().setCustomId("edit_stock").setLabel("Stock").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("<a:BoxBox:1449707866079494154>"), new discord_js_1.ButtonBuilder().setCustomId("edit_desc").setLabel("Desc").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("<:scrolll:1446218234171887760>"));
        const row2 = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("btn_effects").setLabel("Edit Effects").setStyle(discord_js_1.ButtonStyle.Primary).setEmoji("<:sparks:1449708086099968031>"), new discord_js_1.ButtonBuilder().setCustomId("btn_delete").setLabel("DELETE ITEM").setStyle(discord_js_1.ButtonStyle.Danger).setEmoji("<a:Delete:1449708417890386062>"), new discord_js_1.ButtonBuilder().setCustomId("btn_done").setLabel("Done").setStyle(discord_js_1.ButtonStyle.Success));
        return { embeds: [embed], components: [row1, row2] };
    };
    const ui = renderPanel(targetItem, view);
    const panelMsg = await message.reply(ui);
    const collector = panelMsg.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 300000,
        filter: (i) => i.user.id === message.author.id
    });
    collector.on("collect", async (interaction) => {
        if (!targetItem)
            return;
        try {
            const btnId = interaction.customId;
            // --- Navigation & Simple Actions ---
            if (btnId === "btn_back") {
                view = "MAIN";
                await interaction.update(renderPanel(targetItem, view));
                return;
            }
            if (btnId === "btn_effects") {
                view = "EFFECTS";
                await interaction.update(renderPanel(targetItem, view));
                return;
            }
            if (btnId === "btn_done") {
                await interaction.update({ components: [] });
                collector.stop();
                return;
            }
            if (btnId === "btn_delete") {
                await (0, shopService_1.deleteShopItem)(targetItem.id);
                await interaction.update({ content: `🗑️ **${targetItem.name}** has been deleted.`, embeds: [], components: [] });
                collector.stop();
                return;
            }
            if (btnId === "btn_clear_effects") {
                targetItem = await (0, shopService_1.updateShopItem)(message.guildId, targetItem.id, { effects: [] });
                await interaction.update(renderPanel(targetItem, view));
                return;
            }
            // --- Add Effect Flow (Local Loop) ---
            if (btnId === "btn_add_effect") {
                const select = new discord_js_1.StringSelectMenuBuilder()
                    .setCustomId("select_effect_type")
                    .setPlaceholder("Select effect type...")
                    .addOptions([
                    { label: "Temporary Role", value: "ROLE_TEMPORARY", description: "Give a role for a duration" },
                    { label: "XP Multiplier", value: "XP_MULTIPLIER", description: "Multiply XP gain" },
                    { label: "Level Boost", value: "LEVEL_BOOST", description: "Instantly add levels" },
                    { label: "Money Reward", value: "MONEY", description: "Give coins" },
                    { label: "Custom Message", value: "CUSTOM_MESSAGE", description: "Bot replies with a message" },
                    { label: "Permanent Role", value: "ROLE_PERMANENT", description: "Give a role forever" },
                ]);
                // 1. Reply with ephemeral select menu
                const reply = await interaction.reply({
                    content: "Choose effect type:",
                    components: [new discord_js_1.ActionRowBuilder().addComponents(select)],
                    ephemeral: true,
                    fetchReply: true
                });
                // 2. Wait for selection
                const selectInt = await reply.awaitMessageComponent({
                    componentType: discord_js_1.ComponentType.StringSelect,
                    time: 60000,
                    filter: (i) => i.user.id === interaction.user.id
                });
                const type = selectInt.values[0];
                let modal = new discord_js_1.ModalBuilder().setCustomId(`modal_effect_${type}`).setTitle(`Add ${type}`);
                // 3. Construct Modal
                if (type === "ROLE_TEMPORARY") {
                    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_role_id").setLabel("Role ID").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_duration").setLabel("Duration (30s, 5m, 2h, 1d)").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)));
                }
                else if (type === "ROLE_PERMANENT") {
                    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_role_id").setLabel("Role ID").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)));
                }
                else if (type === "XP_MULTIPLIER") {
                    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_mult").setLabel("Multiplier (e.g. 2.0)").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)), new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_duration").setLabel("Duration (30s, 5m, 2h, 1d)").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)));
                }
                else if (type === "LEVEL_BOOST") {
                    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_levels").setLabel("Levels to Add").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)));
                }
                else if (type === "MONEY") {
                    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_amount").setLabel("Amount").setStyle(discord_js_1.TextInputStyle.Short).setRequired(true)));
                }
                else if (type === "CUSTOM_MESSAGE") {
                    modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.TextInputBuilder().setCustomId("val_msg").setLabel("Message").setStyle(discord_js_1.TextInputStyle.Paragraph).setRequired(true)));
                }
                // 4. Show Modal
                await selectInt.showModal(modal);
                // 5. Wait for Modal Submit
                const modalSubmit = await selectInt.awaitModalSubmit({
                    time: 300000,
                    filter: (i) => i.user.id === interaction.user.id && i.customId === `modal_effect_${type}`
                });
                // 6. Process Data
                const newEffect = { type };
                if (type === "ROLE_TEMPORARY") {
                    newEffect.roleId = modalSubmit.fields.getTextInputValue("val_role_id");
                    newEffect.duration = (0, duration_1.parseDuration)(modalSubmit.fields.getTextInputValue("val_duration"));
                }
                // ... similar processing for others ...
                if (type === "ROLE_PERMANENT") {
                    newEffect.roleId = modalSubmit.fields.getTextInputValue("val_role_id");
                }
                if (type === "XP_MULTIPLIER") {
                    newEffect.multiplier = parseFloat(modalSubmit.fields.getTextInputValue("val_mult"));
                    newEffect.duration = (0, duration_1.parseDuration)(modalSubmit.fields.getTextInputValue("val_duration"));
                    if (isNaN(newEffect.multiplier))
                        throw new Error("Invalid multiplier");
                }
                if (type === "LEVEL_BOOST") {
                    newEffect.levels = parseInt(modalSubmit.fields.getTextInputValue("val_levels"));
                    if (isNaN(newEffect.levels))
                        throw new Error("Invalid levels");
                }
                if (type === "MONEY") {
                    newEffect.amount = parseInt(modalSubmit.fields.getTextInputValue("val_amount"));
                    if (isNaN(newEffect.amount))
                        throw new Error("Invalid amount");
                }
                if (type === "CUSTOM_MESSAGE") {
                    newEffect.message = modalSubmit.fields.getTextInputValue("val_msg");
                }
                const currentEffects = targetItem.effects || [];
                currentEffects.push(newEffect);
                // 7. Update DB & UI
                targetItem = await (0, shopService_1.updateShopItem)(message.guildId, targetItem.id, { effects: currentEffects });
                await modalSubmit.deferUpdate();
                await panelMsg.edit(renderPanel(targetItem, view));
                await reply.delete().catch(() => { }); // Clean up ephemeral
                return;
            }
            // --- Main Edit Flow (Edit Name, Price, etc) ---
            let modalId = "";
            let labels = { name: "New Name", price: "New Price", stock: "Stock (-1 inf)", desc: "Description" };
            let fieldId = "";
            let style = discord_js_1.TextInputStyle.Short;
            let currentVal = "";
            if (btnId === "edit_name") {
                modalId = "modal_name";
                fieldId = "val_name";
                currentVal = targetItem.name;
            }
            if (btnId === "edit_price") {
                modalId = "modal_price";
                fieldId = "val_price";
                currentVal = String(targetItem.price);
            }
            if (btnId === "edit_stock") {
                modalId = "modal_stock";
                fieldId = "val_stock";
                currentVal = String(targetItem.stock);
            }
            if (btnId === "edit_desc") {
                modalId = "modal_desc";
                fieldId = "val_desc";
                currentVal = targetItem.description;
                style = discord_js_1.TextInputStyle.Paragraph;
            }
            if (modalId) {
                const modal = new discord_js_1.ModalBuilder().setCustomId(modalId).setTitle(`Edit Item`);
                const input = new discord_js_1.TextInputBuilder().setCustomId(fieldId).setLabel(labels[btnId.replace("edit_", "")] || "Value").setStyle(style).setValue(currentVal).setRequired(true);
                modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
                const submit = await interaction.awaitModalSubmit({
                    time: 60000,
                    filter: (i) => i.user.id === interaction.user.id && i.customId === modalId
                });
                const updates = {};
                const val = submit.fields.getTextInputValue(fieldId);
                if (modalId === "modal_name")
                    updates.name = val;
                if (modalId === "modal_desc")
                    updates.description = val;
                if (modalId === "modal_price") {
                    const p = parseInt(val);
                    if (isNaN(p) || p < 0) {
                        await submit.reply({ content: "Invalid price", ephemeral: true });
                        return;
                    }
                    updates.price = p;
                }
                if (modalId === "modal_stock") {
                    const s = parseInt(val);
                    if (isNaN(s)) {
                        await submit.reply({ content: "Invalid stock", ephemeral: true });
                        return;
                    }
                    updates.stock = s;
                }
                targetItem = await (0, shopService_1.updateShopItem)(message.guildId, targetItem.id, updates);
                await submit.deferUpdate();
                await panelMsg.edit(renderPanel(targetItem, view));
            }
        }
        catch (err) {
            // Catch interaction errors or timeouts
            const e = err;
            if (e.message.includes("Collector received no interactions"))
                return; // timeouts
            // Try to report error to user if possible
            console.error("ManageShop Error:", e);
            // Only try to reply if the interaction hasn't been replied/deferred? 
            // Hard to know exact state here, so maybe just console log.
        }
    });
    collector.on("end", () => {
        if (panelMsg.editable)
            panelMsg.edit({ components: [] }).catch(() => { });
    });
}
function formatEffectDetails(e) {
    switch (e.type) {
        case "ROLE_TEMPORARY": return `Role: <@&${e.roleId}> | Duration: ${e.duration}s`;
        case "ROLE_PERMANENT": return `Role: <@&${e.roleId}>`;
        case "XP_MULTIPLIER": return `Mult: ${e.multiplier}x | Duration: ${e.duration}s`;
        case "LEVEL_BOOST": return `Levels: +${e.levels}`;
        case "MONEY": return `Money: ${e.amount}`;
        case "CUSTOM_MESSAGE": return `Msg: "${e.message}"`;
        default: return "Unknown";
    }
}
//# sourceMappingURL=manageShop.js.map