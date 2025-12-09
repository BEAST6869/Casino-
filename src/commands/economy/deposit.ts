import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { depositToBank, getBankByUserId } from "../../services/bankService";
import { getGuildConfig } from "../../services/guildConfigService"; // Cached Config
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency, parseSmartAmount } from "../../utils/format";
import { logToChannel } from "../../utils/discordLogger";

export async function handleDeposit(message: Message, args: string[]) {
  const user = await ensureUserAndWallet(message.author.id, message.author.tag);

  // 1. Fetch Config (Instant Cache)
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  const wallet = user.wallet!;
  const amountStr = args[0];

  if (!amountStr) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!dep <amount/all>`")] });
  }

  const amount = parseSmartAmount(amountStr, user.wallet!.balance);

  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please enter a valid positive number.")] });
  }

  try {
    const { bank, actualAmount } = await depositToBank(wallet.id, user.id, amount, message.guildId!);
    // Refresh bank used to be handled by getBankByUserId but now we likely have updated bank or can fetch if needed, 
    // but the return object 'bank' is the *pre-update* object + transaction updates it. 
    // Actually Prisma update returns the new object. In bankService we returned 'bank' which was the *found* object, not the updated one.
    // Wait, in my bankService update:
    /* 
       prisma.bank.update(...) is inside transaction. 
       The function likely returns 'bank' which is the OLD object because we just did 'const bank = await ensureBank'.
       We should probably fetch the new balance or just add actualAmount to the old balance for display.
       Or better, let's fetch it freshly to be 100% sure. 
    */
    const updatedBank = await getBankByUserId(user.id);

    const isPartial = actualAmount < amount;
    const partialMsg = isPartial ? ` (Partial Deposit - Bank Limit Reached)` : "";

    // Log Deposit
    await logToChannel(message.client, {
      guild: message.guild!,
      type: "ECONOMY",
      title: "Bank Deposit",
      description: `**User:** ${message.author.tag}\n**Amount:** ${fmtCurrency(actualAmount, emoji)}${partialMsg}\n**New Balance:** ${fmtCurrency(updatedBank?.balance ?? 0, emoji)}`,
      color: 0x00AAFF
    });

    return message.reply({
      embeds: [
        successEmbed(
          message.author,
          isPartial ? "Partial Deposit" : "Deposit Successful",
          `Deposited **${fmtCurrency(actualAmount, emoji)}**${partialMsg}.\nBank: **${fmtCurrency(updatedBank?.balance ?? 0, emoji)}**`
        )
      ]
    });
  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Failed", (err as Error).message)] });
  }
}