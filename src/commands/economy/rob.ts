// src/commands/economy/rob.ts
import { Message } from "discord.js";
import prisma from "../../utils/prisma";
import { ensureUserAndWallet } from "../../services/walletService";
import { getGuildConfig } from "../../services/guildConfigService";
import { checkCooldown } from "../../utils/cooldown";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { fmtCurrency } from "../../utils/format";

export async function handleRob(message: Message, args: string[]) {
  const targetUser = message.mentions.members?.first();
  if (!targetUser) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Target", "Mention a user to rob.")] });
  }

  if (targetUser.id === message.author.id) {
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "You cannot rob yourself.")] });
  }

  if (targetUser.user.bot) {
    return message.reply({ embeds: [errorEmbed(message.author, "Error", "You cannot rob bots.")] });
  }

  // 1. Fetch Config
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  // 2. Check Cooldown
  const cdKey = `rob:${message.guildId}:${message.author.id}`;
  const remaining = checkCooldown(cdKey, config.robCooldown);
  if (remaining > 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Cooldown", `You must wait **${remaining}s** before robbing again.`)] });
  }

  // 3. Check Immunity (Roles)
  const isImmune = targetUser.roles.cache.some(r => config.robImmuneRoles.includes(r.id));
  if (isImmune) {
    return message.reply({ embeds: [errorEmbed(message.author, "Rob Failed", `**${targetUser.displayName}** is immune to being robbed!`)] });
  }

  // 4. Fetch Wallets (Robber & Victim)
  const robber = await ensureUserAndWallet(message.author.id, message.author.tag);
  const victim = await ensureUserAndWallet(targetUser.id, targetUser.user.tag);

  if (!victim.wallet || victim.wallet.balance <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Rob Failed", `**${targetUser.displayName}** has no money in their wallet.`)] });
  }

  // Require robber to have some money (optional, prevents risk-free spam)
  if (robber.wallet!.balance < 100) {
     return message.reply({ embeds: [errorEmbed(message.author, "Too Poor", "You need at least 100 coins to attempt a robbery.")] });
  }

  // 5. Calculate Outcome
  const roll = Math.random() * 100;
  const isSuccess = roll < config.robSuccessPct;

  if (isSuccess) {
    // Determine amount (random 10% to 50% of victim's wallet)
    const percent = Math.floor(Math.random() * 41) + 10; // 10-50
    const robAmount = Math.floor((victim.wallet.balance * percent) / 100);

    await prisma.$transaction([
      // Deduct from victim
      prisma.wallet.update({ where: { id: victim.wallet.id }, data: { balance: { decrement: robAmount } } }),
      prisma.transaction.create({ data: { walletId: victim.wallet.id, amount: -robAmount, type: "robbed_by", meta: { robber: robber.discordId } } }),
      
      // Add to robber
      prisma.wallet.update({ where: { id: robber.wallet!.id }, data: { balance: { increment: robAmount } } }),
      prisma.transaction.create({ data: { walletId: robber.wallet!.id, amount: robAmount, type: "rob_win", meta: { victim: victim.discordId }, isEarned: true } })
    ]);

    return message.reply({ 
      embeds: [successEmbed(message.author, "Robbery Successful! 🥷", `You stole **${fmtCurrency(robAmount, emoji)}** from **${targetUser.displayName}**!`)] 
    });
  } else {
    // FAILED: Pay fine
    const fineAmount = Math.floor((robber.wallet!.balance * config.robFinePct) / 100);
    const actualFine = Math.max(fineAmount, 50); // Minimum fine 50

    await prisma.$transaction([
      prisma.wallet.update({ where: { id: robber.wallet!.id }, data: { balance: { decrement: actualFine } } }),
      prisma.transaction.create({ data: { walletId: robber.wallet!.id, amount: -actualFine, type: "rob_fine", meta: { victim: victim.discordId } } })
    ]);

    return message.reply({ 
      embeds: [errorEmbed(message.author, "Robbery Failed 🚔", `You were caught! You paid a fine of **${fmtCurrency(actualFine, emoji)}**.`)] 
    });
  }
}