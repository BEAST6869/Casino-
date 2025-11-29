import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { getBankByUserId } from "../../services/bankService";
import { getGuildConfig } from "../../services/guildConfigService"; // Import
import { balanceEmbed } from "../../utils/embed";

export async function handleBalance(message: Message) {
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  const bank = await getBankByUserId(user.id);
  const config = await getGuildConfig(message.guildId!); // Fetch config

  return message.reply({
    embeds: [
      // Pass config.currencyEmoji
      balanceEmbed(message.author, user.wallet!.balance, bank?.balance ?? 0, config.currencyEmoji)
    ]
  });
}