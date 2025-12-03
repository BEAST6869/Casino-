import { 
  Message, 
  EmbedBuilder, 
  Colors, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} from "discord.js";
import prisma from "../../utils/prisma";
import { getGuildConfig } from "../../services/guildConfigService";
import { fmtCurrency } from "../../utils/format";
import { emojiInline } from "../../utils/emojiRegistry";

export async function handleLeaderboard(message: Message, args: string[]) {
  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;
  
  // 1. Get custom emojis for UI elements
  const eGraphRaw = emojiInline("graph", message.guild) || "📈";
  const eWalletRaw = emojiInline("Wallet", message.guild) || "👛";
  
  // 2. Get custom medal emojis (Fallback to unicode if not found)
  const eMedal1 = emojiInline("medal1", message.guild) || "🥇";
  const eMedal2 = emojiInline("medal2", message.guild) || "🥈";
  const eMedal3 = emojiInline("medal3", message.guild) || "🥉";

  // 3. Parse emojis for Buttons (Buttons need just the ID if custom, or the unicode char)
  const parseBtnEmoji = (raw: string) => raw.match(/:(\d+)>/)?.[1] ?? (raw.match(/^\d+$/) ? raw : raw);
  const btnGraph = parseBtnEmoji(eGraphRaw);
  const btnWallet = parseBtnEmoji(eWalletRaw);

  // Determine type: "cash" or "net" (default)
  const type = args[0]?.toLowerCase() === "cash" ? "cash" : "net";

  // Fetch top users
  const users = await prisma.user.findMany({
    include: { wallet: true, bank: true },
  });

  // Sort logic
  const sorted = users.sort((a, b) => {
    const netA = (a.wallet?.balance ?? 0) + (type === "net" ? (a.bank?.balance ?? 0) : 0);
    const netB = (b.wallet?.balance ?? 0) + (type === "net" ? (b.bank?.balance ?? 0) : 0);
    return netB - netA;
  });

  const top10 = sorted.slice(0, 10);

  const description = top10.map((u, i) => {
    const val = (u.wallet?.balance ?? 0) + (type === "net" ? (u.bank?.balance ?? 0) : 0);
    
    // Medal Logic using custom server emojis
    let rankDisplay = `**${i + 1}.**`;
    if (i === 0) rankDisplay = eMedal1;
    if (i === 1) rankDisplay = eMedal2;
    if (i === 2) rankDisplay = eMedal3;

    return `${rankDisplay} **${u.username}** — ${fmtCurrency(val, emoji)}`;
  }).join("\n");

  const title = type === "net" ? `${eGraphRaw} Net Worth Leaderboard` : `${eWalletRaw} Cash Leaderboard`;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(Colors.Gold)
    .setDescription(description || "No users found.")
    .setFooter({ text: "Top 10 Richest Users" });

  // Buttons to toggle view
  const netButton = new ButtonBuilder()
    .setCustomId("lb_net")
    .setLabel("Net Worth")
    .setStyle(type === "net" ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
  const cashButton = new ButtonBuilder()
    .setCustomId("lb_cash")
    .setLabel("Cash Only")
    .setStyle(type === "cash" ? ButtonStyle.Primary : ButtonStyle.Secondary);

  // Apply emojis to buttons safely
  try { netButton.setEmoji(btnGraph); } catch { netButton.setEmoji("📈"); }
  try { cashButton.setEmoji(btnWallet); } catch { cashButton.setEmoji("👛"); }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(netButton, cashButton);

  const sent = await message.reply({ embeds: [embed], components: [row] });

  // Interactive Switching
  const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

  collector.on("collect", async (i) => {
    const newType = i.customId === "lb_net" ? "net" : "cash";
    
    // Re-sort based on new selection
    const newSorted = users.sort((a, b) => {
      const netA = (a.wallet?.balance ?? 0) + (newType === "net" ? (a.bank?.balance ?? 0) : 0);
      const netB = (b.wallet?.balance ?? 0) + (newType === "net" ? (b.bank?.balance ?? 0) : 0);
      return netB - netA;
    });
    
    const newTop = newSorted.slice(0, 10);
    const newDesc = newTop.map((u, idx) => {
      const val = (u.wallet?.balance ?? 0) + (newType === "net" ? (u.bank?.balance ?? 0) : 0);
      
      let rankDisplay = `**${idx + 1}.**`;
      if (idx === 0) rankDisplay = eMedal1;
      if (idx === 1) rankDisplay = eMedal2;
      if (idx === 2) rankDisplay = eMedal3;

      return `${rankDisplay} **${u.username}** — ${fmtCurrency(val, emoji)}`;
    }).join("\n");

    const newTitle = newType === "net" ? `${eGraphRaw} Net Worth Leaderboard` : `${eWalletRaw} Cash Leaderboard`;
    
    embed.setTitle(newTitle).setDescription(newDesc);
    
    // Update button styles to show active state
    netButton.setStyle(newType === "net" ? ButtonStyle.Primary : ButtonStyle.Secondary);
    cashButton.setStyle(newType === "cash" ? ButtonStyle.Primary : ButtonStyle.Secondary);

    // Reconstruct row with updated button styles
    const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(netButton, cashButton);

    await i.update({ embeds: [embed], components: [newRow] });
  });

  collector.on("end", () => {
    // Disable buttons on timeout
    try {
      netButton.setDisabled(true);
      cashButton.setDisabled(true);
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(netButton, cashButton);
      sent.edit({ components: [disabledRow] }).catch(() => {});
    } catch {}
  });
}