"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSetRob = handleSetRob;
const guildConfigService_1 = require("../../services/guildConfigService");
const embed_1 = require("../../utils/embed");
const format_1 = require("../../utils/format");
async function handleSetRob(message, args) {
    if (!message.member?.permissions.has("Administrator")) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "No Permission", "Admins only.")] });
    }
    const sub = (args[0] ?? "").toLowerCase();
    const val = args[1];
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guildId);
    // Display current settings if no args
    if (!sub) {
        const immuneRoles = config.robImmuneRoles.length
            ? config.robImmuneRoles.map(r => `<@&${r}>`).join(", ")
            : "None";
        const desc = `
**Success Rate:** ${config.robSuccessPct}%
**Fine Rate:** ${config.robFinePct}% (lost on fail)
**Cooldown:** ${config.robCooldown}s
**Immune Roles:** ${immuneRoles}
    `;
        return message.reply({ embeds: [(0, embed_1.infoEmbed)(message.author, "👮 Rob Configuration", desc)] });
    }
    // !setrob success 50
    if (sub === "success") {
        const pct = parseInt(val);
        if (isNaN(pct) || pct < 0 || pct > 100)
            return message.reply("Invalid percentage (0-100).");
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robSuccessPct: pct });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Updated", `Rob success rate set to **${pct}%**`)] });
    }
    // !setrob fine 20
    if (sub === "fine") {
        const pct = parseInt(val);
        if (isNaN(pct) || pct < 0 || pct > 100)
            return message.reply("Invalid percentage (0-100).");
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robFinePct: pct });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Updated", `Rob failure fine set to **${pct}%**`)] });
    }
    // !setrob cooldown 300 (or 2h 30m)
    if (sub === "cooldown" || sub === "cd") {
        const timeStr = args.slice(1).join(" ");
        const sec = (0, format_1.parseDuration)(timeStr || val);
        if (sec === null || sec < 0)
            return message.reply("Invalid duration (e.g. `1h 30m`, `300`).");
        await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robCooldown: sec });
        return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Updated", `Rob cooldown set to **${(0, format_1.formatDuration)(sec * 1000)}**`)] });
    }
    // !setrob immunity add @Role
    if (sub === "immunity") {
        const action = (args[1] ?? "").toLowerCase(); // add or remove
        const roleId = message.mentions.roles.first()?.id || args[2];
        if (!roleId)
            return message.reply("Please mention a role or provide a valid Role ID.");
        let currentRoles = config.robImmuneRoles || [];
        if (action === "add") {
            if (currentRoles.includes(roleId))
                return message.reply("Role is already immune.");
            currentRoles.push(roleId);
            await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robImmuneRoles: currentRoles });
            return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Immunity Added", `Role <@&${roleId}> is now immune to robbing.`)] });
        }
        else if (action === "remove" || action === "rem") {
            if (!currentRoles.includes(roleId))
                return message.reply("Role is not in the immunity list.");
            currentRoles = currentRoles.filter(id => id !== roleId);
            await (0, guildConfigService_1.updateGuildConfig)(message.guildId, { robImmuneRoles: currentRoles });
            return message.reply({ embeds: [(0, embed_1.successEmbed)(message.author, "Immunity Removed", `Role <@&${roleId}> is no longer immune.`)] });
        }
        else {
            return message.reply("Usage: `!setrob immunity <add|remove> <@role>`");
        }
    }
    return message.reply("Usage: `!setrob <success|fine|cooldown|immunity>`");
}
//# sourceMappingURL=setRob.js.map