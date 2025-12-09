import { Message } from "discord.js";
import { updateGuildConfig, getGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { parseSmartAmount, fmtCurrency } from "../../utils/format";

export async function handleSetMinBet(message: Message, args: string[]) {
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
  }

  const amountStr = args[0];
  if (!amountStr) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!setminbet <amount>`")] });
  }

  const amount = parseSmartAmount(amountStr);
  if (isNaN(amount) || amount < 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid number.")] });
  }

  await updateGuildConfig(message.guildId!, { minBet: amount });
  const config = await getGuildConfig(message.guildId!);

  return message.reply({
    embeds: [successEmbed(message.author, "Min Bet Updated", `Minimum bet set to **${fmtCurrency(amount, config.currencyEmoji)}**.`)]
  });
}