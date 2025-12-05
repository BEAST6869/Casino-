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

// --- THE MENU (Guide & Play Info) ---
export async function handleRouletteMenu(message: Message) {
  // Custom Emojis provided by user
  const eCasino = "<:casino:1445732641545654383>";
  const eScroll = "<:scroll:1446218234171887760>";
  const eDicesBtn = "<:dices:1446220119733702767>";
  
  const eBlackCoin = "<:BlackCoin:1446217613632999565>";
  const eRedCoin = "<:redcoin:1446217599439343772>";
  const eDiceSpecific = "<:dice:1446217848551899300>";

  // Helper to extract ID for buttons
  const parseEmojiId = (str: string) => str.match(/:(\d+)>/)?.[1] ?? (str.match(/^\d+$/) ? str : str);

  const embed = new EmbedBuilder()
    .setTitle(`${eCasino} Roulette Table`) 
    .setDescription("Welcome to the Casino! Test your luck on the wheel.")
    .setColor(Colors.Red)
    .setImage("https://media.tenor.com/7gKkK6W85GgAAAAC/roulette-casino.gif") 
    .setFooter({ text: "Click 'Guide' for rules or 'Play' to start." });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("roul_guide")
      .setLabel("Guide")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(parseEmojiId(eScroll)),
    
    new ButtonBuilder()
      .setCustomId("roul_play")
      .setLabel("How to Play")
      .setStyle(ButtonStyle.Success)
      .setEmoji(parseEmojiId(eDicesBtn))
  );

  const sent = await message.reply({ embeds: [embed], components: [row] });

  const collector = sent.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000,
    filter: (i) => i.user.id === message.author.id
  });

  collector.on("collect", async (i: ButtonInteraction) => {
    if (i.customId === "roul_guide") {
      const guideEmbed = new EmbedBuilder()
        .setTitle(`${eScroll} Roulette Rules`)
        .setColor(Colors.Blue)
        .setDescription(
          `**Multipliers:**\n\n` +
          `${eRedCoin} **Red / ${eBlackCoin} Black:**\n` + 
          `2x Payout (Win chance ~48.6%)\n\n` +
          
          `${eDiceSpecific} **Specific Number (0-36):**\n` + 
          `35x Payout (Win chance ~2.7%)\n\n` +
          
          `🔵 **Odd / 🟡 Even:**\n` + 
          `2x Payout\n\n` +
          
          `**House Edge:** The green **0** belongs to the house!`
        );
      await i.reply({ embeds: [guideEmbed], ephemeral: true });
    }

    if (i.customId === "roul_play") {
      await i.reply({ 
        content: "To place a bet, type:\n`!bet <amount> <choice>`\n\n**Examples:**\n`!bet 100 red`\n`!bet 500 17`\n`!bet 1000 odd`", 
        ephemeral: true 
      });
    }
  });
}

// --- THE GAME LOGIC (!bet) ---
export async function handleBet(message: Message, args: string[]) {
  const amountStr = args[0];
  const choiceRaw = (args[1] || "").toLowerCase();

  if (!amountStr || !choiceRaw) {
    return handleRouletteMenu(message);
  }

  const amount = parseInt(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return message.reply({ embeds: [errorEmbed(message.author, "Invalid Wager", "Please bet a valid positive amount.")] });
  }

  const config = await getGuildConfig(message.guildId!);
  const emoji = config.currencyEmoji;
  const minBet = config.minBet; // <--- Fetch Min Bet

  // Check Minimum Bet
  if (amount < minBet) {
    return message.reply({ 
      embeds: [errorEmbed(message.author, "Bet Too Low", `The minimum bet is **${fmtCurrency(minBet, emoji)}**.`)] 
    });
  }

  const user = await ensureUserAndWallet(message.author.id, message.author.tag);
  if (user.wallet!.balance < amount) {
    return message.reply({ embeds: [errorEmbed(message.author, "Insufficient Funds", "You don't have enough money in your wallet.")] });
  }

  // --- Roulette Logic ---
  const spin = Math.floor(Math.random() * 37); // 0-36
  const redNumbers = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  const isRed = redNumbers.has(spin);
  const isBlack = !isRed && spin !== 0; 

  let didWin = false;
  let multiplier = 0;

  if (choiceRaw === "red") {
    didWin = isRed;
    multiplier = 2;
  } else if (choiceRaw === "black") {
    didWin = isBlack;
    multiplier = 2;
  } else if (choiceRaw === "odd") {
    didWin = (spin !== 0 && spin % 2 !== 0);
    multiplier = 2;
  } else if (choiceRaw === "even") {
    didWin = (spin !== 0 && spin % 2 === 0);
    multiplier = 2;
  } else {
    // Number bet
    const numChoice = parseInt(choiceRaw);
    if (!isNaN(numChoice) && numChoice >= 0 && numChoice <= 36) {
      didWin = (spin === numChoice);
      multiplier = 35;
    } else {
      return message.reply({ embeds: [errorEmbed(message.author, "Invalid Choice", "Bet on `red`, `black`, `odd`, `even`, or a number `0-36`.")] });
    }
  }

  const payout = didWin ? Math.floor(amount * multiplier) : 0;

  try {
    await placeBetWithTransaction(user.id, user.wallet!.id, "roulette_v1", amount, choiceRaw, didWin, payout);
  } catch (e) {
    await placeBetFallback(user.wallet!.id, user.id, "roulette_v1", amount, choiceRaw, didWin, payout);
  }

  // Result Embed
  const eRedCoin = "<:redcoin:1446217599439343772>";
  const eBlackCoin = "<:BlackCoin:1446217613632999565>";
  const displayColor = spin === 0 ? "🟢" : (isRed ? eRedCoin : eBlackCoin);

  const resultEmbed = new EmbedBuilder()
    .setTitle(didWin ? "🎉 Winner!" : "💀 You Lost")
    .setColor(didWin ? Colors.Green : Colors.Red)
    .setDescription(
      `**Result:** ${displayColor} **${spin}**\n` +
      `**Your Bet:** ${choiceRaw}\n` +
      `**${didWin ? "Won" : "Lost"}:** ${fmtCurrency(didWin ? payout : amount, emoji)}`
    )
    // Footer shows only numeric balance (clean look)
    .setFooter({ text: `${message.author.username}'s Wallet: ${(user.wallet!.balance - amount) + payout}` });

  return message.reply({ embeds: [resultEmbed] });
}