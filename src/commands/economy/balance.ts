// src/commands/economy/balance.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { getBankByUserId } from "../../services/bankService";
import { getGuildConfig } from "../../services/guildConfigService";
import { balanceEmbed, errorEmbed } from "../../utils/embed";

export async function handleBalance(message: Message) {
  // Check if a user was mentioned
  let targetUser = message.mentions.users.first();

  // If no mention, default to the author
  if (!targetUser) {
    targetUser = message.author;
  }

  // Prevent checking bots 
  if (targetUser.bot) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Error", "Bots do not have wallets.")]
    });
  }

  // Ensure the target user has a wallet in the database
  const user = await ensureUserAndWallet(targetUser.id, targetUser.tag);
  const bank = await getBankByUserId(user.id);
  const config = await getGuildConfig(message.guildId!);

  return message.reply({
    embeds: [
      balanceEmbed(targetUser, user.wallet!.balance, bank?.balance ?? 0, config.currencyEmoji, config.walletLimit, config.bankLimit)
    ]
  });
}