"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleProfile = handleProfile;
const discord_js_1 = require("discord.js");
const walletService_1 = require("../../services/walletService");
const bankService_1 = require("../../services/bankService");
const shopService_1 = require("../../services/shopService");
const guildConfigService_1 = require("../../services/guildConfigService");
const format_1 = require("../../utils/format");
const embed_1 = require("../../utils/embed");
const emojiRegistry_1 = require("../../utils/emojiRegistry");
async function handleProfile(message, args) {
    try {
        const targetUser = message.mentions.users.first() || message.author;
        if (targetUser.bot)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Bots do not have profiles.")] });
        // 1. Fetch User First (We need the internal database ID for Bank lookup)
        const user = await (0, walletService_1.ensureUserAndWallet)(targetUser.id, targetUser.tag);
        // 2. Now fetch dependent data using the correct IDs
        const [inventory, bank, config] = await Promise.all([
            (0, shopService_1.getUserInventory)(targetUser.id, message.guildId),
            (0, bankService_1.getBankByUserId)(user.id),
            (0, guildConfigService_1.getGuildConfig)(message.guildId)
        ]);
        const currencyEmoji = config.currencyEmoji;
        const walletBal = user.wallet?.balance ?? 0;
        const bankBal = bank?.balance ?? 0;
        // 3. Calculate Inventory Value
        const inventoryValue = inventory.reduce((sum, slot) => {
            return sum + (slot.shopItem.price * slot.amount);
        }, 0);
        // 4. Calculate Net Worth
        const netWorth = walletBal + bankBal + inventoryValue;
        // 5. Resolve Custom Emojis from Guild (fallback to defaults if missing)
        // Using standard unicode Wallet/Purse emoji if custom 'wallet' not found
        const eWallet = (0, emojiRegistry_1.emojiInline)("Wallet", message.guild) || "👛";
        const eBank = (0, emojiRegistry_1.emojiInline)("bank", message.guild) || "🏦";
        const eInv = (0, emojiRegistry_1.emojiInline)("inventory", message.guild) || "🎒";
        const eGraph = (0, emojiRegistry_1.emojiInline)("graph", message.guild) || "📈";
        const eCredits = (0, emojiRegistry_1.emojiInline)("credits", message.guild) || "🏆";
        // 6. Build Profile Embed
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`${targetUser.username}'s Profile`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setColor(discord_js_1.Colors.Gold)
            .addFields({ name: `${eWallet} Wallet`, value: (0, format_1.fmtCurrency)(walletBal, currencyEmoji), inline: true }, { name: `${eBank} Bank`, value: (0, format_1.fmtCurrency)(bankBal, currencyEmoji), inline: true }, { name: `${eInv} Inventory Value`, value: (0, format_1.fmtCurrency)(inventoryValue, currencyEmoji), inline: true }, { name: `${eGraph} Net Worth`, value: (0, format_1.fmtCurrency)(netWorth, currencyEmoji), inline: true }, { name: `${eCredits} Credit Score`, value: `${user.creditScore}`, inline: true })
            .setFooter({ text: "Global Economy Stats" })
            .setTimestamp();
        // 7. Create Buttons with Matching Emojis
        // Helper to safely extract ID or return unicode char
        const parseEmojiForButton = (str) => str.match(/:(\d+)>/)?.[1] ?? (str.match(/^\d+$/) ? str : str);
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId("prof_inv")
            .setLabel("Inventory")
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji(parseEmojiForButton(eInv)), new discord_js_1.ButtonBuilder()
            .setCustomId("prof_bal")
            .setLabel("Balance")
            .setStyle(discord_js_1.ButtonStyle.Secondary)
            .setEmoji(parseEmojiForButton(eWallet)));
        const sentMsg = await message.reply({ embeds: [embed], components: [row] });
        // 8. Interaction Collector
        const collector = sentMsg.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            time: 60000,
            filter: (i) => i.user.id === message.author.id
        });
        collector.on("collect", async (interaction) => {
            if (interaction.customId === "prof_inv") {
                if (inventory.length === 0) {
                    await interaction.reply({ content: "Inventory is empty.", ephemeral: true });
                }
                else {
                    const itemsList = inventory.slice(0, 10).map(i => `• ${i.shopItem.name} (x${i.amount})`).join("\n");
                    const invEmbed = new discord_js_1.EmbedBuilder()
                        .setTitle(`${eInv} Quick Inventory`)
                        .setColor(discord_js_1.Colors.Blue)
                        .setDescription(itemsList + (inventory.length > 10 ? `\n...and ${inventory.length - 10} more` : ""));
                    await interaction.reply({ embeds: [invEmbed], ephemeral: true });
                }
            }
            if (interaction.customId === "prof_bal") {
                const balEmbed = new discord_js_1.EmbedBuilder()
                    .setTitle(`${eGraph} Balance Details`)
                    .setColor(discord_js_1.Colors.Green)
                    .addFields({ name: "Wallet", value: (0, format_1.fmtCurrency)(walletBal, currencyEmoji), inline: true }, { name: "Bank", value: (0, format_1.fmtCurrency)(bankBal, currencyEmoji), inline: true }, { name: "Net Worth", value: (0, format_1.fmtCurrency)(netWorth, currencyEmoji), inline: true })
                    .setFooter({ text: "Private View" });
                await interaction.reply({ embeds: [balEmbed], ephemeral: true });
            }
        });
        collector.on("end", () => {
            try {
                const disabledRow = discord_js_1.ActionRowBuilder.from(row).setComponents(row.components.map(c => discord_js_1.ButtonBuilder.from(c).setDisabled(true)));
                sentMsg.edit({ components: [disabledRow] }).catch(() => { });
            }
            catch { }
        });
    }
    catch (err) {
        console.error("Profile Error:", err);
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "Failed to load profile.")] });
    }
}
//# sourceMappingURL=profile.js.map