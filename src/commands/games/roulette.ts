import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { placeBetWithTransaction, placeBetFallback } from "../../services/gameService";
import { getGuildConfig } from "../../services/guildConfigService"; // Import
import prisma from "../../utils/prisma";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";

export async function handleBet(message: Message, args: string[]) {
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;
  
  // ... (args parsing & game logic) ...
  const amount = Math.floor(Number(args[0] || 0));
  const choiceRaw = (args[1] || "red").toLowerCase();
  
  if (!amount || amount <= 0) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!bet <amount> <choice>`")] });
  
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  if (user.wallet!.balance < amount) return message.reply({ embeds: [errorEmbed(message.author, "Insufficient Funds", "You don't have enough in your wallet.")] });

  // ... (spin logic, red/black check etc.) ...
  const spin = Math.floor(Math.random() * 37);
  // ... check win ...
  // [Assuming you kept the logic from previous steps for spin/win/payout]
  const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const isRed = redNumbers.has(spin);
  let didWin = false;
  let payout = 0;
  const choice = choiceRaw;

  if (choice === "red") { didWin = isRed; payout = didWin ? amount * 2 : 0; }
  else if (choice === "black") { didWin = !isRed && spin !== 0; payout = didWin ? amount * 2 : 0; }
  else if (choice === "odd") { didWin = spin !== 0 && spin % 2 === 1; payout = didWin ? amount * 2 : 0; }
  else if (choice === "even") { didWin = spin !== 0 && spin % 2 === 0; payout = didWin ? amount * 2 : 0; }
  else {
      const num = Number(choice);
      if (!Number.isNaN(num) && num >= 0 && num <= 36) { didWin = spin === num; payout = didWin ? amount * 35 : 0; }
      else return message.reply({ embeds: [errorEmbed(message.author, "Invalid Choice", "Red, Black, Odd, Even, or 0-36")]});
  }

  // ... (transaction calls) ...
  try {
      await placeBetWithTransaction(user.id, user.wallet!.id, "roulette", amount, choice, didWin, payout);
  } catch (e) {
      await placeBetFallback(user.wallet!.id, user.id, "roulette", amount, choice, didWin, payout);
  }

  const newWallet = await prisma.wallet.findUnique({ where: { id: user.wallet!.id } });
  const newBal = newWallet?.balance ?? 0;

  if (didWin) {
    return message.reply({
      embeds: [successEmbed(message.author, "🎉 You Won!", `Spin: **${spin}**\nPayout: **${fmtCurrency(payout, emoji)}**\nNew Balance: **${fmtCurrency(newBal, emoji)}**`)]
    });
  } else {
    return message.reply({
      embeds: [errorEmbed(message.author, "💀 You Lost", `Spin: **${spin}**\nLost: **${fmtCurrency(amount, emoji)}**\nNew Balance: **${fmtCurrency(newBal, emoji)}**`)]
    });
  }
}