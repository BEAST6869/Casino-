// src/utils/embed.ts
import { EmbedBuilder, Colors, User } from "discord.js";

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

export function balanceEmbed(user: User, wallet: number, bank: number) {
  return baseEmbed(user)
    .setTitle(`${user.username}'s Balance`)
    .addFields(
      { name: "Wallet", value: `${wallet}`, inline: true },
      { name: "Bank", value: `${bank}`, inline: true }
    );
}
