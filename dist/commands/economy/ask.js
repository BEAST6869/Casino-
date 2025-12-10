"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAsk = handleAsk;
const discord_js_1 = require("discord.js");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleAsk(message, args) {
    if (!message.guild)
        return;
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
    if (!config.enableAskCommand) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Feature Disabled", "The `!ask` command is currently disabled on this server.")]
        });
    }
    const targetUser = message.mentions.users.first();
    const amountStr = args.find(a => !a.startsWith("<@") && !isNaN(parseInt(a)));
    const amount = amountStr ? parseInt(amountStr) : 0;
    const reasonIndex = args.indexOf(amountStr || "") + 1;
    const reason = args.slice(reasonIndex).join(" ") || "No reason provided";
    if (!targetUser || amount <= 0) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}ask @user <amount> [reason]\`\nExample: \`${config.prefix}ask @Friend 100 For pizza\``)]
        });
    }
    if (targetUser.id === message.author.id) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Target", "You cannot ask yourself for money.")] });
    }
    if (targetUser.bot) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Target", "You cannot ask bots for money.")] });
    }
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`💸 Money Request`)
        .setDescription(`**${message.author.username}** is asking **${targetUser.username}** for money.`)
        .addFields({ name: "Amount", value: `${(0, format_1.fmtCurrency)(amount, config.currencyEmoji)}`, inline: true }, { name: "Reason", value: reason, inline: true })
        .setColor(0xFFFF00) // Yellow
        .setFooter({ text: "Click Accept to transfer immediately." });
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`ask_accept:${message.author.id}:${amount}`)
        .setLabel("Accept")
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId(`ask_decline:${message.author.id}`)
        .setLabel("Decline")
        .setStyle(discord_js_1.ButtonStyle.Danger));
    return message.channel.send({
        content: `<@${targetUser.id}>`,
        embeds: [embed],
        components: [row]
    });
}
//# sourceMappingURL=ask.js.map