// src/commands/games/roulette.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { placeBetWithTransaction, placeBetFallback } from "../../services/gameService";
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";

/**
 * Usage: !bet <amount> <choice>
 * choice: red|black|odd|even|<number 0-36>
 */
export async function handleBet(message: Message, args: string[]) {
  const amount = Math.floor(Number(args[0] || 0));
  const choiceRaw = (args[1] || "red").toLowerCase();

  if (!amount || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!bet <amount> <choice>`")] });
  }

  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  const wallet = user.wallet!;
  if (wallet.balance < amount) {
    return message.reply({ embeds: [errorEmbed(message.author, "Insufficient Funds", "You don't have enough in your wallet.")] });
  }

  const spin = Math.floor(Math.random() * 37); // 0-36
  const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const isRed = redNumbers.has(spin);

  let didWin = false;
  let payout = 0;
  const choice = choiceRaw;

  if (choice === "red") {
    didWin = isRed;
    payout = didWin ? amount * 2 : 0;
  } else if (choice === "black") {
    didWin = !isRed && spin !== 0;
    payout = didWin ? amount * 2 : 0;
  } else if (choice === "odd") {
    didWin = spin !== 0 && spin % 2 === 1;
    payout = didWin ? amount * 2 : 0;
  } else if (choice === "even") {
    didWin = spin !== 0 && spin % 2 === 0;
    payout = didWin ? amount * 2 : 0;
  } else {
    const num = Number(choice);
    if (!Number.isNaN(num) && num >= 0 && num <= 36) {
      didWin = spin === num;
      payout = didWin ? amount * 35 : 0;
    } else {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Choice", "Use red/black/odd/even or a number 0-36.")] });
    }
  }

  try {
    await placeBetWithTransaction(user.id, wallet.id, "roulette_id_placeholder", amount, choice, didWin, payout);
  } catch (err) {
    console.warn("Transaction failed, trying fallback:", (err as Error).message);
    try {
      await placeBetFallback(wallet.id, user.id, "roulette_id_placeholder", amount, choice, didWin, payout);
    } catch (err2) {
      console.error("Bet fallback failed:", err2);
      return message.reply({ embeds: [errorEmbed(message.author, "Bet Error", "Internal error during bet.")] });
    }
  }

  const newWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
  const newBal = newWallet?.balance ?? 0;

  if (didWin) {
    return message.reply({
      embeds: [successEmbed(message.author, "🎉 You Won!", `Spin: **${spin}** — Choice: **${choice}**\nPayout: **${payout}**\nNew Balance: **${newBal}**`)]
    });
  } else {
    return message.reply({
      embeds: [errorEmbed(message.author, "💀 You Lost", `Spin: **${spin}** — Choice: **${choice}**\nLost: **${amount}**\nNew Balance: **${newBal}**`)]
    });
  }
}
