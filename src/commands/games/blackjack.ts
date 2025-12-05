import { 
  Message, 
  EmbedBuilder, 
  Colors, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  ButtonInteraction 
} from "discord.js";
import { ensureUserAndWallet } from "../../services/walletService";
import { placeBetWithTransaction, placeBetFallback } from "../../services/gameService";
import { getGuildConfig } from "../../services/guildConfigService";
import { fmtCurrency } from "../../utils/format";
import { successEmbed, errorEmbed } from "../../utils/embed";
import { emojiInline } from "../../utils/emojiRegistry"; 

// --- Types & Constants ---
type Card = { suit: string; rank: string; value: number };
const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

// --- Helpers ---
function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      if (rank === "A") value = 11;
      deck.push({ suit, rank, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateScore(hand: Card[]): number {
  let score = hand.reduce((sum, card) => sum + card.value, 0);
  let aces = hand.filter(card => card.rank === "A").length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function formatHand(hand: Card[], hideFirst = false): string {
  if (hideFirst) {
    return `**??** ${hand.slice(1).map(c => `\`${c.rank}${c.suit}\``).join("  ")}`;
  }
  return hand.map(c => `\`${c.rank}${c.suit}\``).join("  ");
}

// --- Main Handler ---
export async function handleBlackjack(message: Message, args: string[]) {
  const amountStr = args[0];
  if (!amountStr) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", "Usage: `!bj <amount>`")] });
  }

  const amount = parseInt(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Wager", "Please bet a valid positive amount.")] });
  }

  const config = await getGuildConfig(message.guildId!);
  const minBet = config.minBet;
  
  // Use exact strings provided by user for consistent branding
  const eCasino = "<:casino:1445732641545654383>";
  
  // Robustly resolve the currency emoji for display
  let currencyEmoji = config.currencyEmoji;
  
  // Helper to ensure we have a valid emoji string for text fields
  if (/^\d+$/.test(currencyEmoji)) {
      const e = message.guild?.emojis.cache.get(currencyEmoji);
      currencyEmoji = e ? e.toString() : "💰"; 
  }
  
  if (currencyEmoji === "1445732360204193824") {
      currencyEmoji = "<a:money:1445732360204193824>";
  }

  // Check Minimum Bet
  if (amount < minBet) {
    return message.reply({ 
      embeds: [errorEmbed(message.author, "Bet Too Low", `The minimum bet is **${fmtCurrency(minBet, currencyEmoji)}**.`)] 
    });
  }

  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  if (user.wallet!.balance < amount) {
    return message.reply({ embeds: [errorEmbed(message.author, "Insufficient Funds", "You don't have enough money.")] });
  }

  // --- Start Game ---
  const deck = createDeck();
  const playerHand: Card[] = [deck.pop()!, deck.pop()!];
  const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

  let playerScore = calculateScore(playerHand);
  let dealerScore = calculateScore(dealerHand);
  let gameOver = false;
  let result = "";
  let payout = 0;
  let currentBet = amount;

  // Instant Blackjack check
  if (playerScore === 21) {
    gameOver = true;
    if (dealerScore === 21) {
        result = "Push (Both have BJ)";
        payout = currentBet;
    } else {
        result = "Blackjack! You win!";
        payout = Math.ceil(currentBet * 2.5);
    }
  }

  const getEmbed = (reveal: boolean) => {
    const pScore = calculateScore(playerHand);
    const dScore = reveal ? calculateScore(dealerHand) : "?";
    
    const embed = new EmbedBuilder()
      .setTitle(`${eCasino} Blackjack Table`) 
      .setColor(gameOver ? (payout > currentBet ? Colors.Green : (payout === currentBet ? Colors.Yellow : Colors.Red)) : Colors.Blue)
      .addFields(
        { name: `Your Hand (${pScore})`, value: formatHand(playerHand), inline: true },
        { name: `Dealer's Hand (${dScore})`, value: formatHand(dealerHand, !reveal), inline: true }
      );

    let statusText = `**Bet:** ${fmtCurrency(currentBet, currencyEmoji)}`;

    if (gameOver) {
        statusText += `\n\n**${result}**\n${payout > 0 ? `**Payout:** ${fmtCurrency(payout, currencyEmoji)}` : ""}`;
    } else {
        statusText += `\n\nChoose an action below.`;
    }
    
    embed.setDescription(statusText);
    
    embed.setFooter({ text: `${message.author.username}'s Game` });

    return embed;
  };

  const getRows = (disabled: boolean) => {
    return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setEmoji("👊").setDisabled(disabled),
            new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setEmoji("🛑").setDisabled(disabled),
            new ButtonBuilder().setCustomId("bj_double").setLabel("Double").setStyle(ButtonStyle.Success).setEmoji("💰")
                .setDisabled(disabled || playerHand.length > 2 || user.wallet!.balance < currentBet * 2)
        )
    ];
  };

  // If game over instantly
  if (gameOver) {
    try {
        await placeBetWithTransaction(user.id, user.wallet!.id, "blackjack", currentBet, "blackjack", payout > currentBet, payout);
    } catch (e) {
        return message.reply({ content: "Transaction failed." });
    }
    return message.reply({ embeds: [getEmbed(true)] });
  }

  // Active Game
  const msg = await message.reply({ embeds: [getEmbed(false)], components: getRows(false) });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
    filter: i => i.user.id === message.author.id
  });

  collector.on("collect", async (i) => {
    const action = i.customId;

    if (action === "bj_hit") {
        playerHand.push(deck.pop()!);
        playerScore = calculateScore(playerHand);
        if (playerScore > 21) {
            gameOver = true;
            result = "Bust! You went over 21.";
            payout = 0;
            collector.stop();
        }
    } else if (action === "bj_stand") {
        gameOver = true;
        collector.stop();
    } else if (action === "bj_double") {
        if (user.wallet!.balance < currentBet * 2) {
            await i.reply({ content: "Insufficient funds to double.", ephemeral: true });
            return;
        }
        currentBet *= 2;
        playerHand.push(deck.pop()!);
        playerScore = calculateScore(playerHand);
        if (playerScore > 21) {
            result = "Bust! You went over 21.";
            payout = 0;
        }
        gameOver = true;
        collector.stop();
    }

    if (!gameOver) {
        await i.update({ embeds: [getEmbed(false)], components: getRows(false) });
    } else {
        // Dealer Play
        if (playerScore <= 21) {
            while (dealerScore < 17) {
                dealerHand.push(deck.pop()!);
                dealerScore = calculateScore(dealerHand);
            }
            if (dealerScore > 21) {
                result = "Dealer Busts! You Win!";
                payout = currentBet * 2;
            } else if (dealerScore > playerScore) {
                result = "Dealer Wins.";
                payout = 0;
            } else if (dealerScore < playerScore) {
                result = "You Win!";
                payout = currentBet * 2;
            } else {
                result = "Push.";
                payout = currentBet;
            }
        }

        // Transaction
        try {
            await placeBetWithTransaction(user.id, user.wallet!.id, "blackjack", currentBet, "blackjack", payout > currentBet, payout);
        } catch (e) {
            await i.update({ content: `Transaction failed: ${(e as Error).message}`, components: [] });
            return;
        }

        await i.update({ embeds: [getEmbed(true)], components: [] });
    }
  });

  collector.on("end", (_, reason) => {
    if (reason === "time" && !gameOver) {
        msg.edit({ content: "Game timed out. You surrendered.", components: [] });
    }
  });
}