// src/commands/admin/addMoney.ts
import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { ensureUserAndWallet } from "../../services/walletService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtAmount } from "../../utils/format"; // Import

export async function handleAddMoney(message: Message, args: string[]) {
  // ... (Permission check & args parsing) ...
  if (!message.member?.permissions.has("Administrator")) {
    return message.reply({ embeds: [errorEmbed(message.author, "No Permission", "Administrator required.")] });
  }

  const mention = args[0];
  const amount = Math.floor(Number(args[1] ?? 0));
  if (!mention || !amount || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!addmoney @user <amount>`")] });
  }
  
  const discordId = mention.replace(/[<@!>]/g, "");
  // ... (User fetching & Transaction) ...
  const target = await ensureUserAndWallet(discordId, "Unknown");
  
  await prisma.$transaction([
     // ... (transaction logic) ...
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

  // Updated Response
  return message.reply({
    embeds: [successEmbed(message.author, "Added Money", `Added **${fmtAmount(amount)}** to <@${discordId}>'s wallet.`)]
  });
}