// src/commands/economy/balance.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { getBankByUserId } from "../../services/bankService";
import { balanceEmbed } from "../../utils/embed";

export async function handleBalance(message: Message) {
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  const bank = await getBankByUserId(user.id);

  return message.reply({
    embeds: [
      balanceEmbed(message.author, user.wallet!.balance, bank?.balance ?? 0)
    ]
  });
}
