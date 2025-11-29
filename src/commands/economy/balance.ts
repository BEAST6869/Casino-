// src/commands/economy/balance.ts
import { Message, EmbedBuilder, Colors } from "discord.js";
import prisma from "../../utils/prisma";
import { formatNumberIntl } from "../../utils/formatNumber";
import { preferEmojiInlineOrUrl, emojiIconUrl, getEmojiRecord } from "../../utils/emojiRegistry";
import { getGuildConfig } from "../../services/guildConfigService";

/**
 * Robust balance command that tolerates different Prisma schema shapes.
 * Saves you from TS errors by using defensive checks and safe casts.
 */
export async function handleBalance(message: Message, _args: string[] = []) {
  try {
    const author = message.author;
    const guild = message.guild ?? null;

    // fetch guild config for prefix/currency etc
    const guildCfg = guild ? await getGuildConfig(guild.id) : null;
    const currencyName = (guildCfg as any)?.currencyName ?? "Coins";

    // defaults
    let walletBalance = 0;
    let bankBalance = 0;

    // 1) Try: user with relations (common pattern)
    try {
      // Use `as any` for include because generated types might not match our expectation
      const userWithRelations = await (prisma as any).user.findUnique({
        where: { discordId: author.id },
        include: {
          wallet: true,
          bank: true
        }
      });

      if (userWithRelations) {
        // defensive access
        if (userWithRelations.wallet && typeof userWithRelations.wallet.balance === "number") {
          walletBalance = userWithRelations.wallet.balance;
        }
        if (userWithRelations.bank && typeof userWithRelations.bank.balance === "number") {
          bankBalance = userWithRelations.bank.balance;
        }
      }
    } catch {
      // ignore and try other shapes
    }

    // 2) Try: direct wallet model keyed by discordId
    if (walletBalance === 0) {
      try {
        const walletRec = await (prisma as any).wallet.findUnique({
          where: { discordId: author.id }
        });
        if (walletRec && typeof walletRec.balance === "number") walletBalance = walletRec.balance;
      } catch {
        // ignore
      }
    }

    // 3) Try: direct bank model keyed by discordId
    if (bankBalance === 0) {
      try {
        const bankRec = await (prisma as any).bank.findUnique({
          where: { discordId: author.id }
        });
        if (bankRec && typeof bankRec.balance === "number") bankBalance = bankRec.balance;
      } catch {
        // ignore
      }
    }

    // 4) Try: wallet referenced by userId if above failed
    if (walletBalance === 0) {
      try {
        const user = await (prisma as any).user.findUnique({ where: { discordId: author.id } });
        if (user && user.id) {
          const walletByUser = await (prisma as any).wallet.findFirst({ where: { userId: user.id } });
          if (walletByUser && typeof walletByUser.balance === "number") walletBalance = walletByUser.balance;
        }
      } catch {
        // ignore
      }
    }

    // Safety: ensure numbers are numbers
    walletBalance = typeof walletBalance === "number" ? walletBalance : Number(walletBalance) || 0;
    bankBalance = typeof bankBalance === "number" ? bankBalance : Number(bankBalance) || 0;

    // format numbers
    const walletStr = formatNumberIntl(walletBalance);
    const bankStr = formatNumberIntl(bankBalance);

    // Determine emoji/title prefix and thumbnail
    // Prefer guild-specific economyEmoji from GuildConfig if present
    let titlePrefix = "";
    let thumbnailUrl: string | undefined = undefined;

    const guildEconomyId = (guildCfg as any)?.economyEmojiId ?? null;
    if (guildEconomyId) {
      // if emoji exists in this guild, show inline; else use CDN url
      const found = guild?.emojis.cache.get(guildEconomyId);
      if (found) {
        titlePrefix = found.animated ? `<a:${found.name}:${found.id}> ` : `<:${found.name}:${found.id}> `;
        thumbnailUrl = undefined; // inline used, keep thumbnail as bot avatar or registry url later
      } else {
        // use CDN url for this id
        // try to find in client cache to determine animated
        const cached = message.client.emojis.cache.get(guildEconomyId);
        const ext = cached?.animated ? "gif" : "png";
        thumbnailUrl = `https://cdn.discordapp.com/emojis/${guildEconomyId}.${ext}?size=256&quality=lossless`;
      }
    } else {
      // fallback to registry key 'casino_cash' or registry url
      const pick = preferEmojiInlineOrUrl("casino_cash", guild);
      if (pick?.type === "inline") titlePrefix = pick.value + " ";
      if (pick?.type === "url") thumbnailUrl = pick.value;
    }

    // Final fallback thumbnail is bot avatar
    if (!thumbnailUrl) thumbnailUrl = message.client.user?.displayAvatarURL({ size: 256 });

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle(`${titlePrefix}Casino Bot — Balances`)
      .setColor(Colors.Greyple)
      .setThumbnail(thumbnailUrl ?? undefined)
      .setAuthor({ name: `${author.tag}`, iconURL: author.displayAvatarURL({ size: 64 }) })
      .addFields(
        { name: `${currencyName} — Wallet`, value: `\`${walletStr}\``, inline: true },
        { name: `${currencyName} — Bank`, value: `\`${bankStr}\``, inline: true }
      )
      .setFooter({ text: `Use ${(guildCfg as any)?.prefix ?? "!"}help for more commands` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("handleBalance error:", err);
    const errEmbed = new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Could not fetch your balances. If this keeps happening contact the server admin.")
      .setColor(Colors.Red);
    try {
      await message.reply({ embeds: [errEmbed] });
    } catch {}
  }
}
