
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
  const rawAmount = args[1];

  if (!targetUser || !rawAmount) {
    return message.reply({
      embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!removemoney @user <amount> [wallet/bank]`")]
    });
  }

  const cleanAmount = rawAmount.replace(/,/g, "");
  const amount = parseInt(cleanAmount);

  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please provide a valid positive number.")] });
  }

  const type = args[2]?.toLowerCase() === "bank" ? "bank" : "wallet";

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