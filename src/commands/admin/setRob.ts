// src/commands/admin/setRob.ts
import { Message } from "discord.js";
import { getGuildConfig, updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed, infoEmbed } from "../../utils/embed";
import { parseDuration, formatDuration, parseSmartAmount, fmtCurrency } from "../../utils/format"; // Import parseSmartAmount

export async function handleSetRobConfig(message: Message, args: string[]) { // Renamed function
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] }); // Updated error message
  }

  const sub = (args[0] ?? "").toLowerCase();
  const valStr = args[1]; // Changed to valStr

  const config = await getGuildConfig(message.guildId!);

  // Display current settings if no args
  if (!sub) {
    const immuneRoles = config.robImmuneRoles.length
      ? config.robImmuneRoles.map(r => `< @& ${r}> `).join(", ")
      : "None";

    const desc = `
  ** Success Rate:** ${config.robSuccessPct}%
** Fine Rate:** ${config.robFinePct}% (lost on fail)
** Cooldown:** ${config.robCooldown} s
  ** Immune Roles:** ${immuneRoles}
`;
    return message.reply({ embeds: [infoEmbed(message.author, "👮 Rob Configuration", desc)] });
  }

  // New logic for fine, min, max, chance
  if (sub === "fine") {
    if (!valStr) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setrob fine <amount>`")] });
    const val = parseSmartAmount(valStr);
    if (isNaN(val) || val < 0) return message.reply("Invalid fine amount.");
    const config = await getGuildConfig(message.guild!.id);
    await updateGuildConfig(message.guild!.id, { robberyFine: val });
    return message.reply({ embeds: [successEmbed(message.author, "Robbery Fine Updated", `Fine set to **${fmtCurrency(val, config.currencyEmoji)}**.`)] });
  }

  if (sub === "min") {
    if (!valStr) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setrob min <amount>`")] });
    const val = parseSmartAmount(valStr);
    if (isNaN(val) || val < 0) return message.reply("Invalid amount.");
    const config = await getGuildConfig(message.guild!.id);
    await updateGuildConfig(message.guild!.id, { minRobAmount: val });
    return message.reply({ embeds: [successEmbed(message.author, "Min Rob Updated", `Min rob amount set to **${fmtCurrency(val, config.currencyEmoji)}**.`)] });
  }

  if (sub === "max") {
    if (!valStr) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setrob max <amount>`")] });
    const val = parseSmartAmount(valStr);
    if (isNaN(val) || val < 0) return message.reply("Invalid amount.");
    const config = await getGuildConfig(message.guild!.id);
    await updateGuildConfig(message.guild!.id, { maxRobAmount: val });
    return message.reply({ embeds: [successEmbed(message.author, "Max Rob Updated", `Max rob amount set to **${fmtCurrency(val, config.currencyEmoji)}**.`)] });
  }

  if (sub === "chance") {
    if (!valStr) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setrob chance <percent>`")] });
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 100) return message.reply("Invalid chance (0-100).");
    await updateGuildConfig(message.guild!.id, { robberyChance: val / 100 }); // Store as decimal 0.15
    return message.reply({ embeds: [successEmbed(message.author, "Robbery Chance Updated", `Chance set to ** ${val}%**.`)] });
  }

  // Original logic for cooldown (adapted to new structure)
  // !setrob cooldown 300 (or 2h 30m)
  if (sub === "cooldown" || sub === "cd") {
    const timeStr = args.slice(1).join(" ");
    const sec = parseDuration(timeStr || valStr);

    if (sec === null || sec < 0) return message.reply("Invalid duration (e.g. `1h 30m`, `300`).");

    await updateGuildConfig(message.guildId!, { robCooldown: sec });
    return message.reply({ embeds: [successEmbed(message.author, "Updated", `Rob cooldown set to ** ${formatDuration(sec * 1000)}** `)] });
  }

  // !setrob immunity add @Role
  if (sub === "immunity") {
    const action = (args[1] ?? "").toLowerCase(); // add or remove
    const roleId = message.mentions.roles.first()?.id || args[2];

    if (!roleId) return message.reply("Please mention a role or provide a valid Role ID.");

    let currentRoles = config.robImmuneRoles || [];

    if (action === "add") {
      if (currentRoles.includes(roleId)) return message.reply("Role is already immune.");
      currentRoles.push(roleId);
      await updateGuildConfig(message.guildId!, { robImmuneRoles: currentRoles });
      return message.reply({ embeds: [successEmbed(message.author, "Immunity Added", `Role < @& ${roleId}> is now immune to robbing.`)] });
    }
    else if (action === "remove" || action === "rem") {
      if (!currentRoles.includes(roleId)) return message.reply("Role is not in the immunity list.");
      currentRoles = currentRoles.filter(id => id !== roleId);
      await updateGuildConfig(message.guildId!, { robImmuneRoles: currentRoles });
      return message.reply({ embeds: [successEmbed(message.author, "Immunity Removed", `Role < @& ${roleId}> is no longer immune.`)] });
    } else {
      return message.reply("Usage: `!setrob immunity < add | remove > <@role > `");
    }
  }

  return message.reply("Usage: `!setrob <success | fine | cooldown | immunity>`");
}