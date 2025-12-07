import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { depositToBank, getBankByUserId } from "../../services/bankService";
import { getGuildConfig } from "../../services/guildConfigService"; // Cached Config
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";
import { logToChannel } from "../../utils/discordLogger";

export async function handleDeposit(message: Message, args: string[]) {
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);

  // 1. Fetch Config (Instant Cache)
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  const wallet = user.wallet!;
  let amount = 0;

  if (args[0]?.toLowerCase() === "all") {
    amount = wallet.balance;
  } else {
    amount = parseInt(args[0] || "0");
  }

  if (!amount || amount <= 0) return message.reply({ embeds: [errorEmbed(message.author, "Error", "Invalid amount.")] });

  try {
    await depositToBank(wallet.id, user.id, amount);
    const bank = await getBankByUserId(user.id);

    // Log Deposit
    await logToChannel(message.client, {
      guild: message.guild!,
      type: "ECONOMY",
      title: "Bank Deposit",
      description: `**User:** ${message.author.tag}\n**Amount:** ${fmtCurrency(amount, emoji)}\n**New Balance:** ${fmtCurrency(bank?.balance ?? 0, emoji)}`,
      color: 0x00AAFF
    });

    return message.reply({
      embeds: [
        successEmbed(
          message.author,
          "Deposit Successful",
          `Deposited **${fmtCurrency(amount, emoji)}**.\nBank: **${fmtCurrency(bank?.balance ?? 0, emoji)}**`
        )
      ]
    });
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Failed", (err as Error).message)] });
  }
}