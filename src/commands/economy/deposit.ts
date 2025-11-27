// src/commands/economy/deposit.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { depositToBank, getBankByUserId } from "../../services/bankService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleDeposit(message: Message, args: string[]) {
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  const wallet = user.wallet!;

  // If "all" → full balance
  let amount = 0;
  if (args[0] && args[0].toLowerCase() === "all") {
    amount = wallet.balance;
  } else {
    amount = parseInt(args[0] || "0");
  }

  if (!amount || amount <= 0)
    return message.reply({
      embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!deposit <amount | all>`")]
    });

  try {
    await depositToBank(wallet.id, user.id, amount);
    const bank = await getBankByUserId(user.id);
    return message.reply({
      embeds: [
        successEmbed(
          message.author,
          "Deposit Successful",
          `Deposited **${amount}** to bank.\nNew bank balance: **${bank?.balance ?? 0}**`
        )
      ]
    });
  } catch (err) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Deposit Failed", (err as Error).message)]
    });
  }
}
