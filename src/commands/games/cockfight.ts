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
import { generateVsImage, generateWinnerImage } from "../../utils/imageUtils";

const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
const EMOJI_TICK = "<:n_check:1451281806279311435>";
const EMOJI_WIN = "<:MoneyBag:1446970451606896781>";
const EMOJI_RIP = "<:rip:1451287136132403303>";

export async function handleCockFight(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    const config = await getGuildConfig(message.guild.id);

    const targetUser = message.mentions.users.first();
    const rawAmount = args.find(a => !a.startsWith("<@") && /^\d+$/.test(a));

    if (!targetUser || !rawAmount) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}cockfight @user <amount>\`\nMin Bet logic applies.`)]
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

    if (betAmount < config.minBet) {
        return message.reply({ embeds: [errorEmbed(message.author, "Min Bet", `The minimum bet is **${config.minBet}**. `)] });
    }

    const shopItem = await prisma.shopItem.findFirst({
        where: {
            guildId: message.guild.id,
            name: { equals: "Chicken", mode: "insensitive" }
        }
    });

    if (!shopItem) {
        return message.reply({ embeds: [errorEmbed(message.author, "Configuration Error", "There is no item named **Chicken** in the shop. An admin must add it first.")] });
    }

    const invChallenger = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(message.author.id, message.guild.id)), shopItemId: shopItem.id } }
    });

    if (!invChallenger || invChallenger.amount < 1) {
        return message.reply({ embeds: [errorEmbed(message.author, "Missing Item", `You need a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }

    const challengerMeta = (invChallenger.meta as any) || {};
    if (challengerMeta.training) {
        const endTime = Math.floor(challengerMeta.training.endTime / 1000);
        return message.reply({
            embeds: [errorEmbed(message.author, "Busy", `Your chicken is training! Come back <t:${endTime}:R>.`)]
        });
    }

    const invTarget = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(targetUser.id, message.guild.id)), shopItemId: shopItem.id } }
    });

    if (!invTarget || invTarget.amount < 1) {
        return message.reply({ embeds: [errorEmbed(message.author, "Opponent Missing Item", `${targetUser.username} needs a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }

    const targetMeta = (invTarget.meta as any) || {};
    if (targetMeta.training) {
        const endTime = Math.floor(targetMeta.training.endTime / 1000);
        return message.reply({
            embeds: [errorEmbed(message.author, "Busy", `**${targetUser.username}**'s chicken is training! Ends <t:${endTime}:R>.`)]
        });
    }

    const challengerWallet = await prisma.wallet.findUnique({ where: { userId: (await getUserId(message.author.id, message.guild.id)) } });

    const userBal = challengerWallet?.balance || 0;
    if (userBal < betAmount) {
        return message.reply({ embeds: [errorEmbed(message.author, "Insufficient Funds", `You only have **${userBal}** in your wallet.`)] });
    }

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

            try {
                await i.deferUpdate();
            } catch (e) {
                gameStarted = false;
                return;
            }

            const targetDbId = await getUserId(targetUser.id, message.guild!.id);
            const targetWallet = await prisma.wallet.findUnique({ where: { userId: targetDbId } });
            if ((targetWallet?.balance || 0) < betAmount) {
                await i.followUp({ content: "You don't have enough money in your wallet to accept!", ephemeral: true });
                return;
            }

            await i.editReply({ components: [] });
            collector.stop("accepted");

            await runCockFight(message, reply, message.author, targetUser, betAmount, shopItem.id);
        }
    });

    collector.on("end", (collected: any, reason: string) => {
        if (reason === "time") {
            reply.edit({ content: "Challenge expired.", components: [], embeds: [] }).catch(() => { });
        }
    });
}

// ... Rest of the file (helper functions) ...
// Since I cannot write partial updates easily without rewriting the whole file in `write_to_file`, I must include the rest of the file content.
// I'll assume the original helpers are correct and just append them.
async function getUserId(discordId: string, guildId: string): Promise<string> {
    let user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                discordId,
                guildId,
                username: "Unknown",
                wallet: { create: {} },
                bank: { create: {} }
            }
        });
    }
    return user.id;
}


const FIGHT_MOVES = [
    "{attacker} pecks {defender} right in the eye!",
    "{attacker} flutters wildly, confusing {defender}!",
    "{attacker} lands a solid scratch on {defender}'s beak!",
    "{attacker} summons ancient chicken energy against {defender}!",
    "{attacker} attempts a flying kick at {defender}!",
    "{attacker} clucks menacingly, lowering {defender}'s morale!",
    "{defender} slips on a loose feather, taking damage!",
    "{attacker} unleashes a flurry of pecks!",
];

const CRITICAL_MOVES = [
    "CRITICAL HIT! {attacker} tears a hole in the fabric of space-time!",
    "BOOM! {attacker} lands a devastating spur strike!",
    "{attacker} moves so fast they disappear, reappearing behind {defender}!",
];

const MISS_MOVES = [
    "{attacker} misses completely!",
    "{defender} dodges the attack effortlessly!",
    "{attacker} trips over their own feet!",
];

async function runCockFight(
    originalMsg: Message,
    gameMsg: Message,
    p1: User,
    p2: User,
    bet: number,
    chickenItemId: string
) {
    const guildId = originalMsg.guild!.id;

    const p1Id = await getUserId(p1.id, guildId);
    const p2Id = await getUserId(p2.id, guildId);

    await prisma.$transaction([
        prisma.wallet.update({ where: { userId: p1Id }, data: { balance: { decrement: bet } } }),
        prisma.wallet.update({ where: { userId: p2Id }, data: { balance: { decrement: bet } } })
    ]);

    let pot = bet * 2;
    const sideBets: { userId: string, username: string, amount: number, target: "p1" | "p2" }[] = [];

    // --- CONFIG: Bet Timer ---
    const config = await getGuildConfig(guildId);
    const betTimeSeconds = config.cockfightBetTime || 60; // Default 60s
    const betTimeMs = betTimeSeconds * 1000;

    // --- GENERATE VS IMAGE ---
    const vsImage = await generateVsImage(
        p1.displayAvatarURL({ extension: "png", size: 256 }),
        p2.displayAvatarURL({ extension: "png", size: 256 })
    );

    const bettingEmbed = new EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle(`${EMOJI_CHICKEN} Betting Phase!`)
        .setDescription(`The fight is between **${p1.username}** vs **${p2.username}**!
    
    **Main Pot:** ${pot}
    
    Other players can place side bets now!
    **Side Bets Open for ${betTimeSeconds} seconds.**
    
    <:alert_sign:1451625691664875610> **WARNING:** You can only bet **ONCE**. No switching allowed!
    Click the buttons below to bet on a winner.`)
        .setImage("attachment://vs.png")
        .addFields(
            { name: `${p1.username}`, value: "No bets yet.", inline: true },
            { name: `${p2.username}`, value: "No bets yet.", inline: true }
        );

    const betRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`bet_p1`).setLabel(`Bet on ${p1.username}`).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`bet_p2`).setLabel(`Bet on ${p2.username}`).setStyle(ButtonStyle.Primary)
    );

    await gameMsg.edit({ embeds: [bettingEmbed], components: [betRow], files: [vsImage] });

    const betCollector = gameMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: betTimeMs });

    betCollector.on("collect", async (i: ButtonInteraction) => {
        if (i.user.id === p1.id || i.user.id === p2.id) {
            await i.deferReply({ ephemeral: true });
            await i.editReply({ content: "You are fighting! You cannot place side bets." });
            return;
        }

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

            const bettorDbId = await getUserId(submit.user.id, guildId);

            if (sideBets.some(b => b.userId === submit.user.id)) {
                await submit.editReply({ content: "❌ You have already placed a bet! You cannot switch sides or add more." });
                return;
            }

            const bettorWallet = await prisma.wallet.findUnique({ where: { userId: bettorDbId } });

            if (!bettorWallet || bettorWallet.balance < amount) {
                await submit.editReply({ content: `Insufficient funds. Needed **${amount}** but you have **${bettorWallet?.balance ?? 0}**.` });
                return;
            }

            await prisma.wallet.update({ where: { userId: bettorDbId }, data: { balance: { decrement: amount } } });

            sideBets.push({ userId: submit.user.id, username: submit.user.username, amount, target });
            pot += amount;

            await submit.editReply({ content: `Placed bet of **${amount}** on **${targetName}**!` });

            let p1List = sideBets.filter(b => b.target === "p1").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";
            let p2List = sideBets.filter(b => b.target === "p2").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";

            if (p1List.length > 1000) p1List = p1List.slice(0, 990) + "... (more)";
            if (p2List.length > 1000) p2List = p2List.slice(0, 990) + "... (more)";

            const p1Total = sideBets.filter(b => b.target === "p1").reduce((a, b) => a + b.amount, 0);
            const p2Total = sideBets.filter(b => b.target === "p2").reduce((a, b) => a + b.amount, 0);

            bettingEmbed.setFields(
                { name: `${p1.username} (Total: ${p1Total})`, value: p1List, inline: true },
                { name: `${p2.username} (Total: ${p2Total})`, value: p2List, inline: true }
            );
            bettingEmbed.setDescription(`**Main Pot:** ${pot}\nSide Bets Open...`);

            await gameMsg.edit({ embeds: [bettingEmbed] });

        } catch (e) {
        }
    });

    betCollector.on("end", async (collected: any, reason: string) => {
        const p1Id = await getUserId(p1.id, guildId);
        const p1Inv = await prisma.inventory.findUnique({ where: { userId_shopItemId: { userId: p1Id, shopItemId: chickenItemId } } });
        const p1Meta = (p1Inv?.meta as any) || {};
        const p1Level = p1Meta.level || 0;

        const p2Id = await getUserId(p2.id, guildId);
        const p2Inv = await prisma.inventory.findUnique({ where: { userId_shopItemId: { userId: p2Id, shopItemId: chickenItemId } } });
        const p2Meta = (p2Inv?.meta as any) || {};
        const p2Level = p2Meta.level || 0;

        const p1Score = (10 + (p1Level * 2)) * (1 + ((p1Meta.strength || 0) * 0.1));
        const p1Agility = p1Meta.agility || 0;
        const p1Defense = p1Meta.defense || 0;

        const p2Score = (10 + (p2Level * 2)) * (1 + ((p2Meta.strength || 0) * 0.1));
        const p2Agility = p2Meta.agility || 0;
        const p2Defense = p2Meta.defense || 0;

        const totalScore = p1Score + p2Score;
        const p1Chance = p1Score / totalScore;

        const rng = Math.random();
        const winnerIsP1 = rng < p1Chance;

        const winnerUser = winnerIsP1 ? p1 : p2;
        const loserUser = winnerIsP1 ? p2 : p1;
        const winnerKey = winnerIsP1 ? "p1" : "p2";
        const winnerLevel = winnerIsP1 ? p1Level : p2Level;

        const winChancePercent = (winnerIsP1 ? p1Chance : (1 - p1Chance)) * 100;

        // --- SIMULATION START ---
        await gameMsg.edit({ components: [] }); // Remove bet buttons
        const totalRounds = 3 + Math.floor(Math.random() * 3); // 3 to 6 rounds
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        let logText = "";

        await gameMsg.edit({
            embeds: [
                new EmbedBuilder()
                    .setColor("#FFA500")
                    .setTitle(`${EMOJI_CHICKEN} FIGHT STARTED!`)
                    .setDescription(`**${p1.username}** vs **${p2.username}**\n\nThe chickens enter the ring...`)
            ]
        });
        await delay(2000);

        for (let i = 1; i <= totalRounds; i++) {
            const isP1Attacking = Math.random() > 0.5;
            const attacker = isP1Attacking ? p1.username : p2.username;
            const defender = isP1Attacking ? p2.username : p1.username;
            const defenderDodgeChance = (isP1Attacking ? p2Agility : p1Agility) * 0.02; // 2% per agility

            let moveText = "";
            const moveRoll = Math.random();
            // Miss chance = base 10% + dodge chance
            if (moveRoll < (0.10 + defenderDodgeChance)) moveText = MISS_MOVES[Math.floor(Math.random() * MISS_MOVES.length)];
            else if (moveRoll > 0.85) moveText = CRITICAL_MOVES[Math.floor(Math.random() * CRITICAL_MOVES.length)];
            else moveText = FIGHT_MOVES[Math.floor(Math.random() * FIGHT_MOVES.length)];

            moveText = moveText.replace(/{attacker}/g, `**${attacker}**`).replace(/{defender}/g, `**${defender}**`);
            logText += `**Round ${i}:** ${moveText}\n`;

            const roundEmbed = new EmbedBuilder()
                .setColor("#FFA500")
                .setTitle(`${EMOJI_CHICKEN} Fight in Progress...`)
                .setDescription(logText)
                .setImage("attachment://vs.png") // Keep the VS image visible
                .setFooter({ text: "Fighting..." });

            await gameMsg.edit({ embeds: [roundEmbed] }); // Keep existing files by not specifying files: []
            await delay(2500);
        }
        // --- SIMULATION END ---

        const winningSideBets = sideBets.filter(b => b.target === winnerKey);
        const sidePayoutRatio = 1.5;

        const payoutOps: any[] = [];
        const mainWinnerPayout = pot;
        const sideWinnersDetails: string[] = [];
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

        if (mainWinnerPayout > 0) {
            const wId = await getUserId(winnerUser.id, guildId);
            payoutOps.push(prisma.wallet.update({ where: { userId: wId }, data: { balance: { increment: mainWinnerPayout } } }));
        }

        const XP_PER_WIN = 50;
        const wId = await getUserId(winnerUser.id, guildId);

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

        const lId = await getUserId(loserUser.id, guildId);
        const loserDefense = winnerIsP1 ? p2Defense : p1Defense;
        const saveChance = Math.min(loserDefense * 0.05, 0.50); // Cap at 50%
        const isSaved = Math.random() < saveChance;

        if (isSaved) {
            // Saved! No delete.
        } else {
            payoutOps.push(prisma.inventory.delete({
                where: { userId_shopItemId: { userId: lId, shopItemId: chickenItemId } }
            }));
        }

        await prisma.$transaction(payoutOps);

        const deathMessage = isSaved
            ? `🛡️ **SAVED!** ${loserUser.username}'s chicken survives due to high Defense!`
            : `${EMOJI_RIP} ${loserUser.username}'s chicken has died.`;

        const EMOJI_XP = "<:xpfull:1451636569982111765>";
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const filledBars = Math.floor((newXp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;

        let sideWinnersText = sideWinnersDetails.length > 0 ? sideWinnersDetails.join("\n") : "None";
        if (sideWinnersText.length > 1024) sideWinnersText = sideWinnersText.slice(0, 1020) + "...";

        // Generate Winner Image
        const winnerImage = await generateWinnerImage(winnerUser.displayAvatarURL({ extension: "png", size: 256 }), winnerUser.username);

        const resultEmbed = new EmbedBuilder()
            .setColor(winnerIsP1 ? "#00FF00" : "#FF0000")
            .setTitle(`${EMOJI_CHICKEN} Cock Fight Result`)
            .setDescription(`The dust settles...\n\n${EMOJI_WIN} ${winnerUser} is the winner!\n${deathMessage}
            
**Battle Stats:**
• Winner Level: ${winnerLevel} ${leveledUp ? `➔ **${newLevel}** (LEVEL UP!)` : `(XP: +${XP_PER_WIN})`}
• Progress: ${progressBar}
• Win Chance: ${winChancePercent.toFixed(1)}%
`)
            .setImage("attachment://winner.png")
            .addFields(
                { name: `${EMOJI_WIN} Main Winner`, value: `${winnerUser} won **${mainWinnerPayout}**!`, inline: false },
                { name: `${EMOJI_WIN} Side Winners`, value: sideWinnersText, inline: false },
                { name: "Stats", value: `Total Pot: ${pot}\nSide ROI: ${sidePayoutRatio.toFixed(2)}x`, inline: false }
            );

        await gameMsg.edit({ embeds: [resultEmbed], components: [], files: [winnerImage] });
    });
}
