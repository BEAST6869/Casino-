"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCollectRoleIncome = handleCollectRoleIncome;
const roleIncomeService_1 = require("../../services/roleIncomeService");
const bankService_1 = require("../../services/bankService");
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const discordLogger_1 = require("../../utils/discordLogger");
async function handleCollectRoleIncome(message, args) {
    if (!message.guild || !message.member)
        return;
    await (0, bankService_1.ensureBankForUser)(message.author.id);
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
    const roleIds = message.member.roles.cache.map(r => r.id);
    try {
        const result = await (0, roleIncomeService_1.claimRoleIncome)(message.author.id, message.guild.id, roleIds);
        if (result.totalClaimed === 0) {
            return message.reply("You have no income to collect right now. (Check your roles or cooldowns).");
        }
        const details = result.details.map(d => {
            const role = message.guild?.roles.cache.get(d.roleId);
            return `• **${role?.name || "Unknown Role"}**: ${(0, format_1.fmtCurrency)(d.amount, config.currencyEmoji)}`;
        }).join("\n");
        await (0, discordLogger_1.logToChannel)(message.client, {
            guild: message.guild,
            type: "ECONOMY",
            title: "Income Collected",
            description: `**User:** ${message.author.tag}\n**Total:** ${(0, format_1.fmtCurrency)(result.totalClaimed, config.currencyEmoji)}`,
            color: 0x00FF00
        });
        const embed = (0, embed_1.successEmbed)(message.author, "Income Collected!", `You collected a total of **${(0, format_1.fmtCurrency)(result.totalClaimed, config.currencyEmoji)}**!\n\n${details}`);
        return message.reply({ embeds: [embed] });
    }
    catch (err) {
        return message.reply(`Error collecting income: ${err.message}`);
    }
}
//# sourceMappingURL=collect.js.map