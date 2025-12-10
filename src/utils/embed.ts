// src/utils/embed.ts
import { EmbedBuilder, Colors, User } from "discord.js";
import { fmtCurrency } from "./format";

// ... keep baseEmbed, infoEmbed, successEmbed, errorEmbed as they were ...

export function baseEmbed(user?: User) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTimestamp()
    .setFooter({ text: "Casino Bot • Play Responsibly" });

  if (user) {
    embed.setAuthor({
      name: user.username,
      iconURL: user.displayAvatarURL({ size: 256 })
    });
  }
  return embed;
}

export function infoEmbed(user: User, title: string, desc?: string) {
  return baseEmbed(user).setTitle(title).setDescription(desc ?? "");
}

export function successEmbed(user: User, title: string, desc?: string) {
  return baseEmbed(user).setColor(Colors.Green).setTitle(title).setDescription(desc ?? "");
}

export function errorEmbed(user: User, title: string, desc?: string) {
  return baseEmbed(user).setColor(Colors.Red).setTitle(title).setDescription(desc ?? "");
}

// UPDATED: Now accepts 'emoji' string
// UPDATED: Now accepts limits
export function balanceEmbed(user: User, wallet: number, bank: number, emoji: string, walletLimit?: number | null, bankLimit?: number | null) {
  const formatField = (amount: number, limit?: number | null) => {
    const amtStr = fmtCurrency(amount, emoji);
    if (limit) {
      return `${amtStr} / ${fmtCurrency(limit, emoji)}`;
    }
    return amtStr;
  };

  return baseEmbed(user)
    .setTitle(`<:wallet:1445689199490633891> ${user.username}'s Balance`)
    .addFields(
      { name: "Wallet", value: formatField(wallet, walletLimit), inline: true },
      { name: "Bank", value: formatField(bank, bankLimit), inline: true }
    );
}