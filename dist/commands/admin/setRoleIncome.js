"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetRoleIncome = handleSetRoleIncome;
const roleIncomeService_1 = require("../../services/roleIncomeService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleSetRoleIncome(message, args) {
    if (!message.guild)
        return;
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins only.")] });
    }
    // Args: <@Role> <amount> [cooldown]
    const role = message.mentions.roles.first();
    const amount = parseInt(args[1]);
    // Parse duration from remaining args
    const timeArgs = args.slice(2).join(" ");
    const cooldown = timeArgs ? (0, format_1.parseDuration)(timeArgs) : 86400; // Default 24h
    if (!role || isNaN(amount) || cooldown === null) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!set-role-income @Role <amount> [cooldown]`\nExample: `!set-role-income @VIP 1000 1d 12h`")] });
    }
    await (0, roleIncomeService_1.setRoleIncome)(message.guild.id, role.id, amount, cooldown);
    return message.reply({
        embeds: [(0, embed_1.successEmbed)(message.author, "Income Set", `Set income for **${role.name}** to **${amount}** every **${(0, format_1.formatDuration)(cooldown * 1000)}**.`)]
    });
}
//# sourceMappingURL=setRoleIncome.js.map