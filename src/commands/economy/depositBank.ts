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
    const { actualAmount } = await depositToBank(user.wallet!.id, user.id, amount, message.guildId!);
    const updatedBank = await getBankByUserId(user.id);

    const isPartial = actualAmount < amount;
    const partialInfo = isPartial ? ` (Partial - Limit Hit)` : "";

    return message.reply({
      embeds: [
        successEmbed(message.author, isPartial ? "Partial Deposit" : "Bank Deposit", `Deposited **${actualAmount}**${partialInfo}.\nBank Balance: **${updatedBank?.balance}**`)
      ]
    });
  } catch (err) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Failed", (err as Error).message)]
    });
  }
}
