"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetRobConfig = handleSetRobConfig;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
const permissionUtils_1 = require("../../utils/permissionUtils");
async function handleSetRobConfig(message, args) {
    if (!message.member || !(await (0, permissionUtils_1.canExecuteAdminCommand)(message, message.member))) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Access Denied", "Admins or Bot Commanders only.")] });
    }
    const sub = (args[0] ?? "").toLowerCase();
    const valStr = args[1];
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    if (!sub) {
        const immuneRoles = config.robImmuneRoles.length
            ? config.robImmuneRoles.map(r => `< @& ${r}> `).join(", ")
            : "None";
        const desc = `  ** Success Rate:** ${config.robSuccessPct}%** Fine Rate:** ${config.robFinePct}% (lost on fail)** Cooldown:** ${config.robCooldown} s  ** Immune Roles:** ${immuneRoles}`;
        return message.reply({ embeds: [(0, embed_1.infoEmbed)(message.author, "👮 Rob Configuration", desc)] });
    }
    if (sub === "fine") {
        if (!valStr)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setrob fine <amount>`")] });
        const val = (0, format_1.parseSmartAmount)(valStr);
        if (isNaN(val) || val < 0)
            return message.reply("Invalid fine amount.");
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
        await (0, guildConfigService_1.updateGuildConfig)(message.guild.id, { robberyFine: val });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Robbery Fine Updated", `Fine set to **${(0, format_1.fmtCurrency)(val, config.currencyEmoji)}**.`)] });
    }
    if (sub === "min") {
        if (!valStr)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setrob min <amount>`")] });
        const val = (0, format_1.parseSmartAmount)(valStr);
        if (isNaN(val) || val < 0)
            return message.reply("Invalid amount.");
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
        await (0, guildConfigService_1.updateGuildConfig)(message.guild.id, { minRobAmount: val });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Min Rob Updated", `Min rob amount set to **${(0, format_1.fmtCurrency)(val, config.currencyEmoji)}**.`)] });
    }
    if (sub === "max") {
        if (!valStr)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setrob max <amount>`")] });
        const val = (0, format_1.parseSmartAmount)(valStr);
        if (isNaN(val) || val < 0)
            return message.reply("Invalid amount.");
        const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
        await (0, guildConfigService_1.updateGuildConfig)(message.guild.id, { maxRobAmount: val });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Max Rob Updated", `Max rob amount set to **${(0, format_1.fmtCurrency)(val, config.currencyEmoji)}**.`)] });
    }
    if (sub === "chance") {
        if (!valStr)
            return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", "Usage: `!setrob chance <percent>`")] });
        const val = parseFloat(valStr);
        if (isNaN(val) || val < 0 || val > 100)
            return message.reply("Invalid chance (0-100).");
        await (0, guildConfigService_1.updateGuildConfig)(message.guild.id, { robberyChance: val / 100 });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Robbery Chance Updated", `Chance set to ** ${val}%**.`)] });
    }
    if (sub === "cooldown" || sub === "cd") {
        const timeStr = args.slice(1).join(" ");
        const sec = (0, format_1.parseDuration)(timeStr || valStr);
        if (sec === null || sec < 0)
            return message.reply("Invalid duration (e.g. `1h 30m`, `300`).");
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robCooldown: sec });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Updated", `Rob cooldown set to ** ${(0, format_1.formatDuration)(sec * 1000)}** `)] });
    }
    if (sub === "immunity") {
        const action = (args[1] ?? "").toLowerCase();
        const roleId = message.mentions.roles.first()?.id || args[2];
        if (!roleId)
            return message.reply("Please mention a role or provide a valid Role ID.");
        let currentRoles = config.robImmuneRoles || [];
        if (action === "add") {
            if (currentRoles.includes(roleId))
                return message.reply("Role is already immune.");
            currentRoles.push(roleId);
            await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robImmuneRoles: currentRoles });
            return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Immunity Added", `Role < @& ${roleId}> is now immune to robbing.`)] });
        }
        else if (action === "remove" || action === "rem") {
            if (!currentRoles.includes(roleId))
                return message.reply("Role is not in the immunity list.");
            currentRoles = currentRoles.filter(id => id !== roleId);
            await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robImmuneRoles: currentRoles });
            return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Immunity Removed", `Role < @& ${roleId}> is no longer immune.`)] });
        }
        else {
            return message.reply("Usage: `!setrob immunity < add | remove > <@role > `");
        }
    }
    return message.reply("Usage: `!setrob <success | fine | cooldown | immunity>`");
}
//# sourceMappingURL=setRob.js.map