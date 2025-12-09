
import { Message, PermissionsBitField } from "discord.js";
import { ensureUserAndWallet, removeMoneyFromWallet } from "../../services/walletService";
import { removeMoneyFromBank } from "../../services/bankService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency, parseSmartAmount } from "../../utils/format";
import { getGuildConfig } from "../../services/guildConfigService";
import { logToChannel } from "../../utils/discordLogger";
import prisma from "../../utils/prisma";

export async function handleRemoveMoney(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "Admins only.")] });
  }

  // Schema: !removemoney <target> <amount> [type]
  // Target: @user
  // Amount: 100, 10%, or "all"
  // Type: wallet (default) OR bank

  const targetUser = message.mentions.users.first();

  // Find amount arg (can be number, percentage, or "all")
  const amountArg = args[1]; // Assuming amount is the second argument after the mention
  const typeArg = args[2]?.toLowerCase() || "wallet";
  const type = typeArg === "bank" ? "bank" : "wallet";

  // Validate Target
  if (!targetUser) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!removemoney @user <amount|all|%> [wallet/bank]`")]
    });
  }

  // Validate Amount
  if (!amountArg) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Invalid Usage", "Please specify an amount, percentage, or 'all'.")]
    });
  }

  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  // Parse Amount Type
  const isAllAmount = /^(all|everyone)$/i.test(amountArg);
  const isPercentage = amountArg.includes("%");
  let value = 0;

  if (!isAllAmount) {
    if (isPercentage) {
      value = parseFloat(amountArg.replace(/,/g, "").replace("%", ""));
    } else {
      value = parseSmartAmount(amountArg);
    }

    if (isNaN(value) || value <= 0) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
    }
  }

  try {
    const user = await ensureUserAndWallet(targetUser.id, targetUser.tag);
    let removeAmount = 0;
    let newBal = 0;

    if (type === "bank") {
      // Fetch Bank explicitly to avoid type errors (ensureUserAndWallet only ensures wallet)
      const bank = await prisma.bank.findUnique({ where: { userId: user.id } });
      const currentBal = bank?.balance || 0;

      if (isAllAmount) {
        removeAmount = currentBal;
      } else if (isPercentage) {
        if (value > 100) return message.reply({ embeds: [errorEmbed(message.author, "Error", "Cannot remove more than 100%.")] });
        removeAmount = Math.floor(currentBal * (value / 100));
      } else {
        removeAmount = value;
      }

      if (removeAmount <= 0 && currentBal > 0) {
        // Edge case: percentage might result in 0 if low balance
        removeAmount = 0;
      }

      // Execute Bank Removal
      if (removeAmount > 0) {
        newBal = await removeMoneyFromBank(user.id, removeAmount);
      } else {
        newBal = currentBal;
      }

      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "Money Removed (Bank)",
        description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${fmtCurrency(removeAmount, emoji)} (${amountArg})\n**New Balance:** ${fmtCurrency(newBal, emoji)}`,
        color: 0xFF0000
      });

      return message.reply({
        embeds: [successEmbed(message.author, "Money Removed", `Removed **${fmtCurrency(removeAmount, emoji)}** from ${targetUser.username}'s **Bank**.\nNew Balance: **${fmtCurrency(newBal, emoji)}**`)]
      });

    } else {
      // Wallet
      const currentBal = user.wallet?.balance || 0;

      if (isAllAmount) {
        removeAmount = currentBal;
      } else if (isPercentage) {
        if (value > 100) return message.reply({ embeds: [errorEmbed(message.author, "Error", "Cannot remove more than 100%.")] });
        removeAmount = Math.floor(currentBal * (value / 100));
      } else {
        removeAmount = value;
      }

      if (removeAmount > 0) {
        newBal = await removeMoneyFromWallet(user.wallet!.id, removeAmount);
      } else {
        newBal = currentBal;
      }

      await logToChannel(message.client, {
        guild: message.guild!,
        type: "ADMIN",
        title: "Money Removed (Wallet)",
        description: `**Admin:** ${message.author.tag}\n**Target:** ${targetUser.tag}\n**Amount:** -${fmtCurrency(removeAmount, emoji)} (${amountArg})\n**New Balance:** ${fmtCurrency(newBal, emoji)}`,
        color: 0xFF0000
      });

      return message.reply({
        embeds: [successEmbed(message.author, "Money Removed", `Removed **${fmtCurrency(removeAmount, emoji)}** from ${targetUser.username}'s **Wallet**.\nNew Balance: **${fmtCurrency(newBal, emoji)}**`)]
      });
    }

  } catch (err) {
    return message.reply({ embeds: [errorEmbed(message.author, "Error", (err as Error).message)] });
  }
}