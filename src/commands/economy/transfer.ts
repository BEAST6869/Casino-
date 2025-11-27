// src/commands/economy/transfer.ts
import { Message } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { transferAnyFunds } from "../../services/transferService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleTransfer(message: Message, args: string[]) {
  try {
    const amount = Math.floor(Number(args[0] || 0));
    const mention = args[1];

    if (!amount || amount <= 0) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Usage: `!transfer <amount> @user`")] });
    if (!mention) return message.reply({ embeds: [errorEmbed(message.author, "Missing Recipient", "Mention a user to transfer to.")] });

    const toId = mention.replace(/[<@!>]/g, "");
    if (!/^\d+$/.test(toId)) return message.reply({ embeds: [errorEmbed(message.author, "Invalid Mention", "Couldn't parse mention.")] });

    const sender = await ensureUserAndWallet(message.author.id, message.author.tag);
    try {
      await transferAnyFunds(sender.wallet!.id, toId, amount, message.author.id, message.guildId ?? undefined);
      return message.reply({ embeds: [successEmbed(message.author, "Transfer Successful", `Transferred **${amount}** to <@${toId}>.`)] });
    } catch (err) {
      return message.reply({ embeds: [errorEmbed(message.author, "Transfer Failed", (err as Error).message)] });
    }
  } catch (err) {
    console.error("handleTransfer error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Something went wrong.")] });
  }
}
