// src/commands/admin/setStartMoney.ts
import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtAmount } from "../../utils/format"; // Import

export async function handleSetStartMoney(message: Message, args: string[]) {
  // ... (Permission checks) ...
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Admins only.")] });
  }

  const amount = Math.floor(Number(args[0] ?? NaN));
  if (!Number.isFinite(amount) || amount < 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!setstartmoney <amount>`")] });
  }

  await updateGuildConfig(message.guildId!, { startMoney: amount });

  // Updated Response
  return message.reply({
    embeds: [successEmbed(message.author, "Start Money Updated", `New starting money set to **${fmtAmount(amount)}**`)]
  });
}