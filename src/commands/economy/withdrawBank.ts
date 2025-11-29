import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { withdrawFromBank, getBankByUserId } from "../../services/bankService";
import { getGuildConfig } from "../../services/guildConfigService"; // Import
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format"; // Import fmtCurrency

export async function handleWithdrawBank(message: Message, args: string[]) {
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  const bank = await getBankByUserId(user.id);
  const config = await getGuildConfig(message.guildId!); // Fetch config
  const emoji = config.currencyEmoji;

  if (!bank) return message.reply({ embeds: [errorEmbed(message.author, "No Bank Account", "You do not have a bank account.")] });

  // ... (args parsing logic) ...
  let amount = 0;
  if (args[0] && args[0].toLowerCase() === "all") {
    amount = bank.balance;
  } else {
    amount = parseInt(args[0] || "0");
  }

  if (!amount || amount <= 0) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!withdraw <amount | all>`")] });

  try {
    await withdrawFromBank(user.wallet!.id, user.id, amount);
    const updated = await getBankByUserId(user.id);

    return message.reply({
      embeds: [
        successEmbed(
          message.author,
          "Withdraw Successful",
          `Withdrew **${fmtCurrency(amount, emoji)}** from bank.\nRemaining bank balance: **${fmtCurrency(updated?.balance ?? 0, emoji)}**`
        )
      ]
    });
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Withdraw Failed", (err as Error).message)] });
  }
}