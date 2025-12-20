import {
    Message,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    User,
    ButtonInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalSubmitInteraction
} from "discord.js";
import prisma from "../../utils/prisma";
import { errorEmbed } from "../../utils/embed";
import { getGuildConfig } from "../../services/guildConfigService";

const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
const EMOJI_TICK = "<:n_check:1451281806279311435>";
const EMOJI_WIN = "<:MoneyBag:1446970451606896781>";
const EMOJI_RIP = "<:rip:1451287136132403303>";

export async function handleCockFight(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;

    // Usage: !cockfight @user <amount>
    const targetUser = message.mentions.users.first();
    const rawAmount = args.find(a => !a.startsWith("<@") && /^\d+$/.test(a));

    if (!targetUser || !rawAmount) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`!cockfight @user <amount>\`\nMin Bet logic applies.`)]
        });
    }

    if (targetUser.id === message.author.id) {
        return message.reply({ embeds: [errorEmbed(message.author, "Error", "You cannot fight yourself.")] });
    }

    if (targetUser.bot) {
        return message.reply({ embeds: [errorEmbed(message.author, "Error", "You cannot fight a bot.")] });
    }

    const betAmount = parseInt(rawAmount);
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Amount", "Please enter a valid positive integer.")] });
    }

    const config = await getGuildConfig(message.guild.id);
    if (betAmount < config.minBet) {
        return message.reply({ embeds: [errorEmbed(message.author, "Min Bet", `The minimum bet is **${config.minBet}**. `)] });
    }

    // 1. Check if both users have a "Chicken" item
    // We need to find the ShopItem for "Chicken" first.
    // Assuming the item name is literally "chicken" (case insensitive usually, but let's try exact or query).
    const shopItem = await prisma.shopItem.findFirst({
        where: {
            guildId: message.guild.id,
            name: { equals: "Chicken", mode: "insensitive" }
        }
    });

    if (!shopItem) {
        return message.reply({ embeds: [errorEmbed(message.author, "Configuration Error", "There is no item named **Chicken** in the shop. An admin must add it first.")] });
    }

    // Check Challenger Inventory
    const invChallenger = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(message.author.id, message.guild.id)), shopItemId: shopItem.id } }
    });

    if (!invChallenger || invChallenger.amount < 1) {
        return message.reply({ embeds: [errorEmbed(message.author, "Missing Item", `You need a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }

    // Check Target Inventory
    const invTarget = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(targetUser.id, message.guild.id)), shopItemId: shopItem.id } }
    });

    if (!invTarget || invTarget.amount < 1) {
        return message.reply({ embeds: [errorEmbed(message.author, "Opponent Missing Item", `${targetUser.username} needs a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }

    // Check Challenger Balance
    const challengerBank = await prisma.bank.findUnique({ where: { userId: (await getUserId(message.author.id, message.guild.id)) } });
    const challengerWallet = await prisma.wallet.findUnique({ where: { userId: (await getUserId(message.author.id, message.guild.id)) } });

    // Logic: Usually betting comes from Wallet based on other commands 
    const userBal = challengerWallet?.balance || 0;
    if (userBal < betAmount) {
        return message.reply({ embeds: [errorEmbed(message.author, "Insufficient Funds", `You only have **${userBal}** in your wallet.`)] });
    }

    // PHASE 2: Challenge Request
    const acceptEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle(`${EMOJI_CHICKEN} Cock Fight Challenge`)
        .setDescription(`${message.author} has challenged ${targetUser} to a **Cock Fight**!\n\n**Bet:** ${betAmount}\n**Requirement:** Both lose their Chicken on defeat.`)
        .setFooter({ text: "Click Accept to start! Expires in 30s." });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("cf_accept").setLabel("Accept").setStyle(ButtonStyle.Success).setEmoji(EMOJI_TICK),
        new ButtonBuilder().setCustomId("cf_deny").setLabel("Deny").setStyle(ButtonStyle.Danger)
    );

    const reply = await (message.channel as any).send({ content: `${targetUser}`, embeds: [acceptEmbed], components: [row] });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });
    let gameStarted = false;

    collector.on("collect", async (i: ButtonInteraction) => {
        if (i.user.id !== targetUser.id) {
            await i.reply({ content: "This challenge is not for you.", ephemeral: true });
            return;
        }

        if (i.customId === "cf_deny") {
            await i.update({ content: "Challenge denied.", components: [], embeds: [] });
            collector.stop("denied");
            return;
        }

        if (i.customId === "cf_accept") {
            if (gameStarted) return;
            gameStarted = true;

            // Defer immediately to prevent "Unknown interaction" if DB calls are slow
            try {
                await i.deferUpdate();
            } catch (e) {
                gameStarted = false; // Reset if interaction failed
                return;
            }

            // Re-check balances and items just in case
            const targetDbId = await getUserId(targetUser.id, message.guild!.id);
            const challengerDbId = await getUserId(message.author.id, message.guild!.id);

            // Check Target Balance
            const targetWallet = await prisma.wallet.findUnique({ where: { userId: targetDbId } });
            if ((targetWallet?.balance || 0) < betAmount) {
                await i.followUp({ content: "You don't have enough money in your wallet to accept!", ephemeral: true });
                return;
            }

            await i.editReply({ components: [] }); // Remove buttons using editReply since we deferred
            collector.stop("accepted");

            // Start the game flow
            await runCockFight(message, reply, message.author, targetUser, betAmount, shopItem.id);
        }
    });

    collector.on("end", (collected: any, reason: string) => {
        if (reason === "time") {
            reply.edit({ content: "Challenge expired.", components: [], embeds: [] }).catch(() => { });
        }
    });
}

// Ensure User Exists Helper
async function getUserId(discordId: string, guildId: string): Promise<string> {
    let user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                discordId,
                guildId,
                username: "Unknown", // Should update
                wallet: { create: {} },
                bank: { create: {} }
            }
        });
    }
    return user.id;
}


async function runCockFight(
    originalMsg: Message,
    gameMsg: Message,
    p1: User,
    p2: User,
    bet: number,
    chickenItemId: string
) {
    const guildId = originalMsg.guild!.id;

    // DEDUCT FUNDS IMMEDIATELY
    const p1Id = await getUserId(p1.id, guildId);
    const p2Id = await getUserId(p2.id, guildId);

    await prisma.$transaction([
        prisma.wallet.update({ where: { userId: p1Id }, data: { balance: { decrement: bet } } }),
        prisma.wallet.update({ where: { userId: p2Id }, data: { balance: { decrement: bet } } })
    ]);

    let pot = bet * 2;
    // Added username to sideBets for display
    const sideBets: { userId: string, username: string, amount: number, target: "p1" | "p2" }[] = [];

    // PHASE 3: Side Betting
    const bettingEmbed = new EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle(`${EMOJI_CHICKEN} Betting Phase!`)
        .setDescription(`The fight is between **${p1.username}** vs **${p2.username}**!
    
    **Main Pot:** ${pot}
    
    Other players can place side bets now!
    **Side Bets Open for 60 seconds.**
    
    <:alert_sign:1451625691664875610> **WARNING:** You can only bet **ONCE**. No switching allowed!
    Click the buttons below to bet on a winner.`)
        .addFields(
            { name: `${p1.username}`, value: "No bets yet.", inline: true },
            { name: `${p2.username}`, value: "No bets yet.", inline: true }
        );

    const betRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`bet_p1`).setLabel(`Bet on ${p1.username}`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bet_p2`).setLabel(`Bet on ${p2.username}`).setStyle(ButtonStyle.Primary)
    );

    await gameMsg.edit({ embeds: [bettingEmbed], components: [betRow] });

    const betCollector = gameMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    betCollector.on("collect", async (i: ButtonInteraction) => {
        // Restriction: Main players cannot side bet
        if (i.user.id === p1.id || i.user.id === p2.id) {
            // Safety: Defer first to avoid Unknown Interaction
            await i.deferReply({ ephemeral: true });
            await i.editReply({ content: "You are fighting! You cannot place side bets." });
            return;
        }

        // Modal for Input
        const target = i.customId === "bet_p1" ? "p1" : "p2";
        const targetName = target === "p1" ? p1.username : p2.username;

        const modal = new ModalBuilder()
            .setCustomId(`modal_bet_${i.id}`)
            .setTitle(`Bet on ${targetName}`);

        const input = new TextInputBuilder()
            .setCustomId("amount")
            .setLabel("Amount to Bet")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("100")
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        await i.showModal(modal);

        try {
            const submit = await i.awaitModalSubmit({ time: 30000 });
            await submit.deferReply({ ephemeral: true });

            const amount = parseInt(submit.fields.getTextInputValue("amount"));

            if (isNaN(amount) || amount <= 0) {
                await submit.editReply({ content: "Invalid amount." });
                return;
            }

            // Determine User
            const bettorDbId = await getUserId(submit.user.id, guildId);

            // CHANGED: Strict Single Bet Rule
            if (sideBets.some(b => b.userId === submit.user.id)) {
                await submit.editReply({ content: "❌ You have already placed a bet! You cannot switch sides or add more." });
                return;
            }

            const bettorWallet = await prisma.wallet.findUnique({ where: { userId: bettorDbId } });

            if (!bettorWallet || bettorWallet.balance < amount) {
                await submit.editReply({ content: `Insufficient funds. Needed **${amount}** but you have **${bettorWallet?.balance ?? 0}**.` });
                return;
            }

            // Deduct Side Bet
            await prisma.wallet.update({ where: { userId: bettorDbId }, data: { balance: { decrement: amount } } });

            sideBets.push({ userId: submit.user.id, username: submit.user.username, amount, target });
            pot += amount;

            await submit.editReply({ content: `Placed bet of **${amount}** on **${targetName}**!` });

            // Update Embed with Names (Truncated)
            let p1List = sideBets.filter(b => b.target === "p1").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";
            let p2List = sideBets.filter(b => b.target === "p2").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";

            if (p1List.length > 1000) p1List = p1List.slice(0, 990) + "... (more)";
            if (p2List.length > 1000) p2List = p2List.slice(0, 990) + "... (more)";

            // Recalculate totals for display if needed, but names are requested
            const p1Total = sideBets.filter(b => b.target === "p1").reduce((a, b) => a + b.amount, 0);
            const p2Total = sideBets.filter(b => b.target === "p2").reduce((a, b) => a + b.amount, 0);

            bettingEmbed.setFields(
                { name: `${p1.username} (Total: ${p1Total})`, value: p1List, inline: true },
                { name: `${p2.username} (Total: ${p2Total})`, value: p2List, inline: true }
            );
            bettingEmbed.setDescription(`**Main Pot:** ${pot}\nSide Bets Open...`);

            await gameMsg.edit({ embeds: [bettingEmbed] });

        } catch (e) {
            // Modal timed out or error
        }
    });

    betCollector.on("end", async (collected: any, reason: string) => {
        // PHASE 4: Resolution

        // 1. Fetch Chicken Levels & Calculate Outcome
        const p1Id = await getUserId(p1.id, guildId);
        const p1Inv = await prisma.inventory.findUnique({ where: { userId_shopItemId: { userId: p1Id, shopItemId: chickenItemId } } });
        const p1Meta = (p1Inv?.meta as any) || {};
        const p1Level = p1Meta.level || 0;

        const p2Id = await getUserId(p2.id, guildId);
        const p2Inv = await prisma.inventory.findUnique({ where: { userId_shopItemId: { userId: p2Id, shopItemId: chickenItemId } } });
        const p2Meta = (p2Inv?.meta as any) || {};
        const p2Level = p2Meta.level || 0;

        // Formula: Score = 10 + (Level * 2)
        const p1Score = 10 + (p1Level * 2);
        const p2Score = 10 + (p2Level * 2);
        const totalScore = p1Score + p2Score;
        const p1Chance = p1Score / totalScore;

        const rng = Math.random();
        const winnerIsP1 = rng < p1Chance;

        const winnerUser = winnerIsP1 ? p1 : p2;
        const loserUser = winnerIsP1 ? p2 : p1;
        const winnerKey = winnerIsP1 ? "p1" : "p2";
        const winnerLevel = winnerIsP1 ? p1Level : p2Level;

        const winChancePercent = (winnerIsP1 ? p1Chance : (1 - p1Chance)) * 100;

        // 2. Calculate Side Payouts
        const winningSideBets = sideBets.filter(b => b.target === winnerKey);

        // Config: Side Bets are paid 1.5x by House. Main Pot is untouched.
        const sidePayoutRatio = 1.5;

        const payoutOps: any[] = [];
        const mainWinnerPayout = pot;

        // Track detailed winnings for embed
        const sideWinnersDetails: string[] = [];

        // Pay Side Winners (Aggregated)
        const payoutMap = new Map<string, number>();

        for (const b of winningSideBets) {
            const payout = Math.floor(b.amount * sidePayoutRatio);
            const current = payoutMap.get(b.userId) || 0;
            payoutMap.set(b.userId, current + payout);

            sideWinnersDetails.push(`<@${b.userId}>: +${payout}`);
        }

        for (const [userId, amount] of payoutMap.entries()) {
            const uId = await getUserId(userId, guildId);
            payoutOps.push(prisma.wallet.update({ where: { userId: uId }, data: { balance: { increment: amount } } }));
        }

        // Pay Main Winner
        if (mainWinnerPayout > 0) {
            const wId = await getUserId(winnerUser.id, guildId);
            payoutOps.push(prisma.wallet.update({ where: { userId: wId }, data: { balance: { increment: mainWinnerPayout } } }));
        }

        // 3. Update Chicken Stats (Winner Gays XP, Loser Dies)

        // Winner: Add XP
        const EMOJI_XP = "<:xpfull:1451636569982111765>";
        const XP_PER_WIN = 50;

        const wId = await getUserId(winnerUser.id, guildId);

        // Calculate new stats
        let newLevel = winnerIsP1 ? p1Level : p2Level;
        let newXp = ((winnerIsP1 ? p1Meta.xp : p2Meta.xp) || 0) + XP_PER_WIN;
        let newWins = ((winnerIsP1 ? p1Meta.wins : p2Meta.wins) || 0) + 1;

        let requiredXp = (newLevel + 1) * 100;
        let leveledUp = false;

        while (newXp >= requiredXp) {
            newXp -= requiredXp;
            newLevel++;
            leveledUp = true;
            requiredXp = (newLevel + 1) * 100;
        }

        payoutOps.push(prisma.inventory.update({
            where: { userId_shopItemId: { userId: wId, shopItemId: chickenItemId } },
            data: {
                meta: {
                    level: newLevel,
                    wins: newWins,
                    xp: newXp
                }
            }
        }));

        // Loser: Death
        const lId = await getUserId(loserUser.id, guildId);
        payoutOps.push(prisma.inventory.delete({
            where: { userId_shopItemId: { userId: lId, shopItemId: chickenItemId } }
        }));

        await prisma.$transaction(payoutOps);

        // Visuals
        // Visuals
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const filledBars = Math.floor((newXp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;

        // Detailed Result Embed construction
        let sideWinnersText = sideWinnersDetails.length > 0 ? sideWinnersDetails.join("\n") : "None";
        if (sideWinnersText.length > 1024) sideWinnersText = sideWinnersText.slice(0, 1020) + "..."; // safety

        const resultEmbed = new EmbedBuilder()
            .setColor(winnerIsP1 ? "#00FF00" : "#FF0000")
            .setTitle(`${EMOJI_CHICKEN} Cock Fight Result`)
            .setDescription(`The dust settles...\n\n${EMOJI_WIN} ${winnerUser} is the winner!\n${EMOJI_RIP} ${loserUser}'s chicken has died.
            
**Battle Stats:**
• Winner Level: ${winnerLevel} ${leveledUp ? `➔ **${newLevel}** (LEVEL UP!)` : `(XP: +${XP_PER_WIN})`}
• Progress: ${progressBar}
• Win Chance: ${winChancePercent.toFixed(1)}%
`)
            .addFields(
                { name: `${EMOJI_WIN} Main Winner`, value: `${winnerUser} won **${mainWinnerPayout}**!`, inline: false },
                { name: `${EMOJI_WIN} Side Winners`, value: sideWinnersText, inline: false },
                { name: "Stats", value: `Total Pot: ${pot}\nSide ROI: ${sidePayoutRatio.toFixed(2)}x`, inline: false }
            );

        await gameMsg.edit({ embeds: [resultEmbed], components: [] });
    });
}
