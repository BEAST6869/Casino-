
import { Message, PermissionsBitField } from "discord.js";
import { ensureUserAndWallet, removeMoneyFromWallet } from "../../services/walletService";
import { removeMoneyFromBank } from "../../services/bankService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";
import { getGuildConfig } from "../../services/guildConfigService";
import { logToChannel } from "../../utils/discordLogger";

export async function handleRemoveMoney(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
  }

  const targetUser = message.mentions.users.first();

  // Find the amount argument (first number found that isn't a user ID, though args are split by space so just looking for digits is usually enough, but let's be safe and filter out the mention if it was in args)
  // Actually, a simpler way for this specific command pattern:
  // args usually contains: ["@user", "100", "bank"] or ["100", "@user"]

  // 1. Get Amount: Find the first argument that looks like a number and matches the regex, excluding the mention syntax if possible, but cleaner is just to regex test.
  const amountArg = args.find(arg => /^\d+(,\d+)*$/.test(arg));

  // 2. Get Type: Find "bank" or "wallet"
  const typeArg = args.find(arg => ["bank", "wallet"].includes(arg.toLowerCase()));
  const type = typeArg?.toLowerCase() === "bank" ? "bank" : "wallet";

  if (!targetUser || !amountArg) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!removemoney @user <amount> [wallet/bank]`")]
    });
  }

  const cleanAmount = amountArg.replace(/,/g, "");
  const amount = parseInt(cleanAmount);

  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
  }

  try {
    const user = await ensureUserAndWallet(targetUser.id, targetUser.tag);
    const config = await getGuildConfig(message.guildId!);
    const emoji = config.currencyEmoji;

    let newBal: number;

    if (type === "bank") {
      newBal = await removeMoneyFromBank(user.id, amount);

      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "Money Removed (Bank)",
        description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${fmtCurrency(amount, emoji)}\n**New Bank Balance:** ${fmtCurrency(newBal, emoji)}`,
        color: 0xFF0000
      });

      return message.reply({
        embeds: [successEmbed(message.author, "Money Removed", `Removed **${fmtCurrency(amount, emoji)}** from ${targetUser.username}'s **Bank**.\nNew Balance: **${fmtCurrency(newBal, emoji)}**`)]
      });
    } else {
      // removeMoneyFromWallet now returns the new balance
      newBal = await removeMoneyFromWallet(user.wallet!.id, amount);

      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "Money Removed (Wallet)",
        description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${fmtCurrency(amount, emoji)}\n**New Wallet Balance:** ${fmtCurrency(newBal, emoji)}`,
        color: 0xFF0000
      });

      return message.reply({
        embeds: [successEmbed(message.author, "Money Removed", `Removed **${fmtCurrency(amount, emoji)}** from ${targetUser.username}'s **Wallet**.\nNew Balance: **${fmtCurrency(newBal, emoji)}**`)]
      });
    }

  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Error", (err as Error).message)] });
  }
}