
import { Message, PermissionsBitField } from "discord.js";
import prisma from "../../utils/prisma";
import { ensureUserAndWallet } from "../../services/walletService";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";
import { logToChannel } from "../../utils/discordLogger";
import { getGuildConfig } from "../../services/guildConfigService";

export async function handleAddMoney(message: Message, args: string[]) {
  if (!message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply({ embeds: [errorEmbed(message.author, "Access Denied", "You need Administrator permissions.")] });
  }

  const mention = args[0];
  const amount = Math.floor(Number(args[1] ?? 0));

  if (!mention || !amount || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!addmoney @user <amount>`")] });
  }

  const discordId = mention.replace(/[<@!>]/g, "");
  const target = await ensureUserAndWallet(discordId, "Unknown");
  const config = await getGuildConfig(message.guildId!);

  const [_, updatedWallet] = await prisma.$transaction([
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
      data: {
        guildId: message.guildId ?? undefined,
        userId: discordId,
        type: "admin_add",
        meta: { amount, by: message.author.id }
      }
    })
  ]);

  if (updatedWallet) {
    // Log It
    await logToChannel(message.client, {
      guild: message.guild!,
      type: "ADMIN",
      title: "Money Added",
      description: `**Admin:** ${message.author.tag} (${message.author.id})\n**Target:** <@${target.discordId}> (${target.discordId})\n**Amount:** +${fmtCurrency(amount, config.currencyEmoji)}\n**New Balance:** ${fmtCurrency(updatedWallet.balance, config.currencyEmoji)}`,
      color: 0x00FF00
    });

    return message.reply({
      embeds: [successEmbed(message.author, "Money Added", `Added **${fmtCurrency(amount, config.currencyEmoji)}** to ${mention}.\nNew Balance: **${fmtCurrency(updatedWallet.balance, config.currencyEmoji)}**`)]
    });
  }
}