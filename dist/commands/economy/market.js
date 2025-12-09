"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const marketService_1 = require("../../services/marketService");
async function execute(message, args) {
    if (!message.guildId)
        return;
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    const { total } = await (0, marketService_1.getMarketListings)(message.guildId, 1, 1);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("🏴‍☠️ Black Market")
        .setDescription(`Welcome to the underground.\n\n**Market Tax:** ${config.marketTax}%\n**Active Listings:** ${total}`)
        .setColor("#36393F")
        .setThumbnail("https://media.tenor.com/azwT6M5tO3EAAAAC/black-market.gif")
        .setFooter({ text: "Buy, Sell, and Trade items securely." });
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder().setCustomId("market_browse_1").setLabel("Browse Market").setStyle(discord_js_1.ButtonStyle.Primary).setEmoji("🛒"), new discord_js_1.ButtonBuilder().setCustomId("market_sell_flow").setLabel("Sell Item").setStyle(discord_js_1.ButtonStyle.Success).setEmoji("➕"), new discord_js_1.ButtonBuilder().setCustomId("market_buy_flow").setLabel("Buy by ID").setStyle(discord_js_1.ButtonStyle.Secondary).setEmoji("🔍"), new discord_js_1.ButtonBuilder().setCustomId("market_mine").setLabel("My Listings").setStyle(discord_js_1.ButtonStyle.Danger).setEmoji("📦"));
    await message.reply({ embeds: [embed], components: [row] });
}
//# sourceMappingURL=market.js.map