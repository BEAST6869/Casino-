import { Message } from "discord.js";
import { updateGuildConfig } from "../../services/guildConfigService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";
import { getGuildConfig } from "../../services/guildConfigService";

export async function handleSetMinBet(message: Message, args: string[]) {
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
  }

  const amountStr = args[0];
  const amount = parseInt(amountStr);

  if (isNaN(amount) || amount < 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!minbet <amount>`")] });
  }

  const config = await getGuildConfig(message.guildId!);
  
  await updateGuildConfig(message.guildId!, { minBet: amount });

  return message.reply({ 
    embeds: [successEmbed(message.author, "Min Bet Updated", `Minimum bet set to **${fmtCurrency(amount, config.currencyEmoji)}**.`)] 
  });
}