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
  // Provided Emoji IDs
  const idCasino = "1445732641545654383";
  const idScroll = "1446218234171887760";
  const idDicesBtn = "1446220119733702767";
  const idBlackCoin = "1446217613632999565";
  const idRedCoin = "1446217599439343772";
  const idDiceSpecific = "1446217848551899300";

  // Helper to resolve emoji string or fallback
  const resolveEmoji = (id: string, fallback: string) => {
    const e = message.guild?.emojis.cache.get(id);
    // If found in cache, use toString() which gives <:name:id> or <a:name:id>
    // If NOT found, manually construct a static string as a best guess, or fallback
    return e ? e.toString() : `<:custom:${id}>`; 
  };

  // Resolve emojis for text (embeds)
  // We force the construction of the custom emoji string if cache misses, assuming they are static.
  // If they are animated, this manual construction <:...> might fail to animate, but will show image if static.
  const eCasino = resolveEmoji(idCasino, "🎰");
  const eScroll = resolveEmoji(idScroll, "📜");
  const eRedCoin = resolveEmoji(idRedCoin, "🔴");
  const eBlackCoin = resolveEmoji(idBlackCoin, "⚫");
  const eDiceSpecific = resolveEmoji(idDiceSpecific, "🎲");

  // Resolve IDs for buttons 
  // ButtonBuilder.setEmoji(id) works best if the emoji is available.
  const btnScroll = idScroll; 
  const btnDices = idDicesBtn;

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
      .setEmoji(btnScroll),
    
    new ButtonBuilder()
      .setCustomId("roul_play")
      .setLabel("How to Play")
      .setStyle(ButtonStyle.Success)
      .setEmoji(btnDices)
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
  // Using custom coin emojis for result display if possible, else defaults
  const idRedCoin = "1446217599439343772";
  const idBlackCoin = "1446217613632999565";
  
  const resolveResultEmoji = (id: string, fb: string) => {
      const e = message.guild?.emojis.cache.get(id);
      return e ? e.toString() : `<:custom:${id}>`;
  };

  const eRed = resolveResultEmoji(idRedCoin, "🔴");
  const eBlack = resolveResultEmoji(idBlackCoin, "⚫");
  const displayColor = spin === 0 ? "🟢" : (isRed ? eRed : eBlack);

  const resultEmbed = new EmbedBuilder()
    .setTitle(didWin ? "🎉 Winner!" : "💀 You Lost")
    .setColor(didWin ? Colors.Green : Colors.Red)
    .setDescription(
      `**Result:** ${displayColor} **${spin}**\n` +
      `**Your Bet:** ${choiceRaw}\n` +
      `**${didWin ? "Won" : "Lost"}:** ${fmtCurrency(didWin ? payout : amount, emoji)}`
    )
    .setFooter({ text: `${message.author.username}'s Wallet: ${(user.wallet!.balance - amount) + payout}` }); // Removed currency emoji from footer as requested

  return message.reply({ embeds: [resultEmbed] });
}