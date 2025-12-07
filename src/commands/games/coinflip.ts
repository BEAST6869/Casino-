import { Message, EmbedBuilder, Colors } from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { placeBetWithTransaction, placeBetFallback } from "../../services/gameService";
import { getGuildConfig } from "../../services/guildConfigService";
import { fmtCurrency } from "../../utils/format";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { checkCooldown } from "../../utils/cooldown";
import { formatDuration } from "../../utils/format";

export async function handleCoinflip(message: Message, args: string[]) {
  // 1. Parse Arguments
  const amountStr = args[0];
  const choiceRaw = (args[1] || "").toLowerCase();

  if (!amountStr || !choiceRaw) {
    return message.reply({
      embeds: [
        errorEmbed(
          message.author,
          "Invalid Usage",
          "Usage: `!cf <amount> <heads|tails>`"
        ),
      ],
    });
  }

  // 2. Validate Amount
  const amount = parseInt(amountStr, 10);
  if (isNaN(amount) || amount <= 0) {
    return message.reply({
      embeds: [
        errorEmbed(
          message.author,
          "Invalid Wager",
          "Please bet a valid positive amount."
        ),
      ],
    });
  }

  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;

  // 3. Validate Choice
  let choice: "heads" | "tails";
  if (["heads", "head", "h"].includes(choiceRaw)) choice = "heads";
  else if (["tails", "tail", "t"].includes(choiceRaw)) choice = "tails";
  else {
    return message.reply({
      embeds: [
        errorEmbed(
          message.author,
          "Invalid Choice",
          "Please choose `heads` or `tails`."
        ),
      ],
    });
  }

  // 4. Check Funds
  // Check Cooldown
  const cooldowns = (config.gameCooldowns as Record<string, number>) || {};
  const cdSeconds = cooldowns["cf"] || 0;

  if (cdSeconds > 0) {
    const key = `game:cf:${message.guildId}:${message.author.id}`;
    const remaining = checkCooldown(key, cdSeconds);
    if (remaining > 0) {
      return message.reply({
        embeds: [errorEmbed(message.author, "Cooldown Active", `⏳ Please wait **${formatDuration(remaining * 1000)}** before flipping again.`)]
      });
    }
  }

  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  if (!user.wallet || user.wallet.balance < amount) {
    return message.reply({
      embeds: [
        errorEmbed(
          message.author,
          "Insufficient Funds",
          "You don't have enough money."
        ),
      ],
    });
  }

  // 5. The Flip
  const isHeads = Math.random() < 0.5;
  const result = isHeads ? "heads" : "tails";
  const didWin = choice === result;
  const payout = didWin ? amount * 2 : 0;

  // 6. Database Transaction
  try {
    await placeBetWithTransaction(
      user.id,
      user.wallet.id,
      "coinflip",
      amount,
      choice,
      didWin,
      payout
    );
  } catch (e) {
    await placeBetFallback(
      user.wallet.id,
      user.id,
      "coinflip",
      amount,
      choice,
      didWin,
      payout
    );
  }

  // Final wallet balance after this bet
  const finalWalletBalance = user.wallet.balance - amount + payout;
  const finalWalletBalanceIntl = finalWalletBalance.toLocaleString("en-US");

  // Parse emoji ID from custom emoji string like "<a:casino_cash:1444352930080882809>"
  let footerIconURL: string | undefined;
  if (typeof emoji === "string") {
    const match = emoji.match(/\d{17,20}/);
    if (match) {
      footerIconURL = `https://cdn.discordapp.com/emojis/${match[0]}.gif?quality=lossless`;
    }
  }

  // 7. Result Embed
  const embed = new EmbedBuilder()
    .setTitle(didWin ? "🎉 You Won!" : "💀 You Lost")
    .setColor(didWin ? Colors.Green : Colors.Red)
    .setThumbnail(
      didWin
        ? "https://media.tenor.com/d6Jd-9w8eJkAAAAC/success-kid-hell-yeah.gif"
        : null
    )
    .setDescription(
      `**You Bet:** ${fmtCurrency(amount, emoji)} on \`${choice.toUpperCase()}\`\n` +
      `**The Coin Flipped:** 🪙 \`${result.toUpperCase()}\`\n\n` +
      (didWin
        ? `**Payout:** ${fmtCurrency(payout, emoji)}`
        : `**Lost:** ${fmtCurrency(amount, emoji)}`)
    )
    .setFooter({
      // no custom emoji text here; just number in international format
      text: `${message.author.username}'s Wallet: ${finalWalletBalanceIntl}`,
      iconURL: footerIconURL, // animated emoji shown here as image
    });

  return message.reply({ embeds: [embed] });
}
