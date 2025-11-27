// src/commands/admin/addMoney.ts
import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { ensureUserAndWallet } from "../../services/walletService";
import { successEmbed, errorEmbed } from "../../utils/embed";

export async function handleAddMoney(message: Message, args: string[]) {
  try {
    if (!message.member?.permissions.has("Administrator")) {
      return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Administrator required.")] });
    }

    const mention = args[0];
    const amount = Math.floor(Number(args[1] ?? 0));
    if (!mention || !amount || amount <= 0) {
      return message.reply({
        embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!addmoney @user <amount>`")]
      });
    }

    const discordId = mention.replace(/[<@!>]/g, "");
    if (!/^\d+$/.test(discordId)) {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Mention", "Couldn't parse the user mention.")] });
    }

    const target = await ensureUserAndWallet(discordId, "Unknown");

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          walletId: target.wallet!.id,
          amount,
          type: "admin_add",
          meta: { by: message.author.id },
          isEarned: false
        }
      }),
      prisma.wallet.update({
        where: { id: target.wallet!.id },
        data: { balance: { increment: amount } }
      }),
      prisma.audit.create({
        data: { guildId: message.guildId ?? undefined, userId: discordId, type: "admin_add", meta: { amount, by: message.author.id } }
      })
    ]);

    return message.reply({
      embeds: [successEmbed(message.author, "Added Money", `Added **${amount}** to <@${discordId}>'s wallet.`)]
    });
  } catch (err) {
    console.error("handleAddMoney error:", err);
    return message.reply({ embeds: [errorEmbed(message.author, "Internal Error", "Failed to add money.")] });
  }
}
