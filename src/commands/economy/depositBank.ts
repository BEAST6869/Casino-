// src/commands/economy/depositBank.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { depositToBank, getBankByUserId } from "../../services/bankService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleDepositBank(message: Message, args: string[]) {
  const amount = parseInt(args[0]);
  if (!amount || amount <= 0)
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid", "Enter a valid amount.")] });

  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  try {
    await depositToBank(user.wallet!.id, user.id, amount);
    const bank = await getBankByUserId(user.id);

    return message.reply({
      embeds: [
        successEmbed(message.author, "Bank Deposit", `Deposited **${amount}**.\nBank Balance: **${bank?.balance}**`)
      ]
    });
  } catch (err) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Failed", (err as Error).message)]
    });
  }
}
