"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCockFight = handleCockFight;
const discord_js_1 = require("discord.js");
const prisma_1 = __importDefault(require("../../utils/prisma"));
const embed_1 = require("../../utils/embed");
const guildConfigService_1 = require("../../services/guildConfigService");
const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
const EMOJI_TICK = "<:n_check:1451281806279311435>";
const EMOJI_WIN = "<:MoneyBag:1446970451606896781>";
const EMOJI_RIP = "<:rip:1451287136132403303>";
async function handleCockFight(message, args) {
    if (!message.guild || !message.member)
        return;
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
    const targetUser = message.mentions.users.first();
    const rawAmount = args.find(a => !a.startsWith("<@") && /^\d+$/.test(a));
    if (!targetUser || !rawAmount) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`${config.prefix}cockfight @user <amount>\`\nMin Bet logic applies.`)]
        });
    }
    if (targetUser.id === message.author.id) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "You cannot fight yourself.")] });
    }
    if (targetUser.bot) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Error", "You cannot fight a bot.")] });
    }
    const betAmount = parseInt(rawAmount);
    if (isNaN(betAmount) || betAmount <= 0) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Amount", "Please enter a valid positive integer.")] });
    }
    if (betAmount < config.minBet) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Min Bet", `The minimum bet is **${config.minBet}**. `)] });
    }
    const shopItem = await prisma_1.default.shopItem.findFirst({
        where: {
            guildId: message.guild.id,
            name: { equals: "Chicken", mode: "insensitive" }
        }
    });
    if (!shopItem) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Configuration Error", "There is no item named **Chicken** in the shop. An admin must add it first.")] });
    }
    const invChallenger = await prisma_1.default.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(message.author.id, message.guild.id)), shopItemId: shopItem.id } }
    });
    if (!invChallenger || invChallenger.amount < 1) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Missing Item", `You need a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }
    const invTarget = await prisma_1.default.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(targetUser.id, message.guild.id)), shopItemId: shopItem.id } }
    });
    if (!invTarget || invTarget.amount < 1) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Opponent Missing Item", `${targetUser.username} needs a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }
    const challengerWallet = await prisma_1.default.wallet.findUnique({ where: { userId: (await getUserId(message.author.id, message.guild.id)) } });
    const userBal = challengerWallet?.balance || 0;
    if (userBal < betAmount) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Insufficient Funds", `You only have **${userBal}** in your wallet.`)] });
    }
    const acceptEmbed = new discord_js_1.EmbedBuilder()
        .setColor("#FFA500")
        .setTitle(`${EMOJI_CHICKEN} Cock Fight Challenge`)
        .setDescription(`${message.author} has challenged ${targetUser} to a **Cock Fight**!\n\n**Bet:** ${betAmount}\n**Requirement:** Both lose their Chicken on defeat.`)
        .setFooter({ text: "Click Accept to start! Expires in 30s." });
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("cf_accept").setLabel("Accept").setStyle(discord_js_1.ButtonStyle.Success).setEmoji(EMOJI_TICK), new discord_js_1.ButtonBuilder().setCustomId("cf_deny").setLabel("Deny").setStyle(discord_js_1.ButtonStyle.Danger));
    const reply = await message.channel.send({ content: `${targetUser}`, embeds: [acceptEmbed], components: [row] });
    const collector = reply.createMessageComponentCollector({ componentType: discord_js_1.ComponentType.Button, time: 30000 });
    let gameStarted = false;
    collector.on("collect", async (i) => {
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
            if (gameStarted)
                return;
            gameStarted = true;
            try {
                await i.deferUpdate();
            }
            catch (e) {
                gameStarted = false;
                return;
            }
            const targetDbId = await getUserId(targetUser.id, message.guild.id);
            const targetWallet = await prisma_1.default.wallet.findUnique({ where: { userId: targetDbId } });
            if ((targetWallet?.balance || 0) < betAmount) {
                await i.followUp({ content: "You don't have enough money in your wallet to accept!", ephemeral: true });
                return;
            }
            await i.editReply({ components: [] });
            collector.stop("accepted");
            await runCockFight(message, reply, message.author, targetUser, betAmount, shopItem.id);
        }
    });
    collector.on("end", (collected, reason) => {
        if (reason === "time") {
            reply.edit({ content: "Challenge expired.", components: [], embeds: [] }).catch(() => { });
        }
    });
}
// ... Rest of the file (helper functions) ...
// Since I cannot write partial updates easily without rewriting the whole file in `write_to_file`, I must include the rest of the file content.
// I'll assume the original helpers are correct and just append them.
async function getUserId(discordId, guildId) {
    let user = await prisma_1.default.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } });
    if (!user) {
        user = await prisma_1.default.user.create({
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
async function runCockFight(originalMsg, gameMsg, p1, p2, bet, chickenItemId) {
    const guildId = originalMsg.guild.id;
    const p1Id = await getUserId(p1.id, guildId);
    const p2Id = await getUserId(p2.id, guildId);
    await prisma_1.default.$transaction([
        prisma_1.default.wallet.update({ where: { userId: p1Id }, data: { balance: { decrement: bet } } }),
        prisma_1.default.wallet.update({ where: { userId: p2Id }, data: { balance: { decrement: bet } } })
    ]);
    let pot = bet * 2;
    const sideBets = [];
    const bettingEmbed = new discord_js_1.EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle(`${EMOJI_CHICKEN} Betting Phase!`)
        .setDescription(`The fight is between **${p1.username}** vs **${p2.username}**!
    
    **Main Pot:** ${pot}
    
    Other players can place side bets now!
    **Side Bets Open for 60 seconds.**
    
    <:alert_sign:1451625691664875610> **WARNING:** You can only bet **ONCE**. No switching allowed!
    Click the buttons below to bet on a winner.`)
        .addFields({ name: `${p1.username}`, value: "No bets yet.", inline: true }, { name: `${p2.username}`, value: "No bets yet.", inline: true });
    const betRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`bet_p1`).setLabel(`Bet on ${p1.username}`).setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`bet_p2`).setLabel(`Bet on ${p2.username}`).setStyle(discord_js_1.ButtonStyle.Primary));
    await gameMsg.edit({ embeds: [bettingEmbed], components: [betRow] });
    const betCollector = gameMsg.createMessageComponentCollector({ componentType: discord_js_1.ComponentType.Button, time: 60000 });
    betCollector.on("collect", async (i) => {
        if (i.user.id === p1.id || i.user.id === p2.id) {
            await i.deferReply({ ephemeral: true });
            await i.editReply({ content: "You are fighting! You cannot place side bets." });
            return;
        }
        const target = i.customId === "bet_p1" ? "p1" : "p2";
        const targetName = target === "p1" ? p1.username : p2.username;
        const modal = new discord_js_1.ModalBuilder()
            .setCustomId(`modal_bet_${i.id}`)
            .setTitle(`Bet on ${targetName}`);
        const input = new discord_js_1.TextInputBuilder()
            .setCustomId("amount")
            .setLabel("Amount to Bet")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setPlaceholder("100")
            .setRequired(true);
        modal.addComponents(new discord_js_1.ActionRowBuilder().addComponents(input));
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
            const bettorWallet = await prisma_1.default.wallet.findUnique({ where: { userId: bettorDbId } });
            if (!bettorWallet || bettorWallet.balance < amount) {
                await submit.editReply({ content: `Insufficient funds. Needed **${amount}** but you have **${bettorWallet?.balance ?? 0}**.` });
                return;
            }
            await prisma_1.default.wallet.update({ where: { userId: bettorDbId }, data: { balance: { decrement: amount } } });
            sideBets.push({ userId: submit.user.id, username: submit.user.username, amount, target });
            pot += amount;
            await submit.editReply({ content: `Placed bet of **${amount}** on **${targetName}**!` });
            let p1List = sideBets.filter(b => b.target === "p1").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";
            let p2List = sideBets.filter(b => b.target === "p2").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";
            if (p1List.length > 1000)
                p1List = p1List.slice(0, 990) + "... (more)";
            if (p2List.length > 1000)
                p2List = p2List.slice(0, 990) + "... (more)";
            const p1Total = sideBets.filter(b => b.target === "p1").reduce((a, b) => a + b.amount, 0);
            const p2Total = sideBets.filter(b => b.target === "p2").reduce((a, b) => a + b.amount, 0);
            bettingEmbed.setFields({ name: `${p1.username} (Total: ${p1Total})`, value: p1List, inline: true }, { name: `${p2.username} (Total: ${p2Total})`, value: p2List, inline: true });
            bettingEmbed.setDescription(`**Main Pot:** ${pot}\nSide Bets Open...`);
            await gameMsg.edit({ embeds: [bettingEmbed] });
        }
        catch (e) {
        }
    });
    betCollector.on("end", async (collected, reason) => {
        const p1Id = await getUserId(p1.id, guildId);
        const p1Inv = await prisma_1.default.inventory.findUnique({ where: { userId_shopItemId: { userId: p1Id, shopItemId: chickenItemId } } });
        const p1Meta = p1Inv?.meta || {};
        const p1Level = p1Meta.level || 0;
        const p2Id = await getUserId(p2.id, guildId);
        const p2Inv = await prisma_1.default.inventory.findUnique({ where: { userId_shopItemId: { userId: p2Id, shopItemId: chickenItemId } } });
        const p2Meta = p2Inv?.meta || {};
        const p2Level = p2Meta.level || 0;
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
        const winningSideBets = sideBets.filter(b => b.target === winnerKey);
        const sidePayoutRatio = 1.5;
        const payoutOps = [];
        const mainWinnerPayout = pot;
        const sideWinnersDetails = [];
        const payoutMap = new Map();
        for (const b of winningSideBets) {
            const payout = Math.floor(b.amount * sidePayoutRatio);
            const current = payoutMap.get(b.userId) || 0;
            payoutMap.set(b.userId, current + payout);
            sideWinnersDetails.push(`<@${b.userId}>: +${payout}`);
        }
        for (const [userId, amount] of payoutMap.entries()) {
            const uId = await getUserId(userId, guildId);
            payoutOps.push(prisma_1.default.wallet.update({ where: { userId: uId }, data: { balance: { increment: amount } } }));
        }
        if (mainWinnerPayout > 0) {
            const wId = await getUserId(winnerUser.id, guildId);
            payoutOps.push(prisma_1.default.wallet.update({ where: { userId: wId }, data: { balance: { increment: mainWinnerPayout } } }));
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
        payoutOps.push(prisma_1.default.inventory.update({
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
        payoutOps.push(prisma_1.default.inventory.delete({
            where: { userId_shopItemId: { userId: lId, shopItemId: chickenItemId } }
        }));
        await prisma_1.default.$transaction(payoutOps);
        const EMOJI_XP = "<:xpfull:1451636569982111765>";
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const filledBars = Math.floor((newXp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;
        let sideWinnersText = sideWinnersDetails.length > 0 ? sideWinnersDetails.join("\n") : "None";
        if (sideWinnersText.length > 1024)
            sideWinnersText = sideWinnersText.slice(0, 1020) + "...";
        const resultEmbed = new discord_js_1.EmbedBuilder()
            .setColor(winnerIsP1 ? "#00FF00" : "#FF0000")
            .setTitle(`${EMOJI_CHICKEN} Cock Fight Result`)
            .setDescription(`The dust settles...\n\n${EMOJI_WIN} ${winnerUser} is the winner!\n${EMOJI_RIP} ${loserUser}'s chicken has died.
            
**Battle Stats:**
• Winner Level: ${winnerLevel} ${leveledUp ? `➔ **${newLevel}** (LEVEL UP!)` : `(XP: +${XP_PER_WIN})`}
• Progress: ${progressBar}
• Win Chance: ${winChancePercent.toFixed(1)}%
`)
            .addFields({ name: `${EMOJI_WIN} Main Winner`, value: `${winnerUser} won **${mainWinnerPayout}**!`, inline: false }, { name: `${EMOJI_WIN} Side Winners`, value: sideWinnersText, inline: false }, { name: "Stats", value: `Total Pot: ${pot}\nSide ROI: ${sidePayoutRatio.toFixed(2)}x`, inline: false });
        await gameMsg.edit({ embeds: [resultEmbed], components: [] });
    });
}
//# sourceMappingURL=cockfight.js.map