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
    // Usage: !cockfight @user <amount>
    const targetUser = message.mentions.users.first();
    const rawAmount = args.find(a => !a.startsWith("<@") && /^\d+$/.test(a));
    if (!targetUser || !rawAmount) {
        return message.reply({
            embeds: [(0, embed_1.errorEmbed)(message.author, "Invalid Usage", `Usage: \`!cockfight @user <amount>\`\nMin Bet logic applies.`)]
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
    const config = await (0, guildConfigService_1.getGuildConfig)(message.guild.id);
    if (betAmount < config.minBet) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Min Bet", `The minimum bet is **${config.minBet}**. `)] });
    }
    // 1. Check if both users have a "Chicken" item
    // We need to find the ShopItem for "Chicken" first.
    // Assuming the item name is literally "chicken" (case insensitive usually, but let's try exact or query).
    const shopItem = await prisma_1.default.shopItem.findFirst({
        where: {
            guildId: message.guild.id,
            name: { equals: "Chicken", mode: "insensitive" }
        }
    });
    if (!shopItem) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Configuration Error", "There is no item named **Chicken** in the shop. An admin must add it first.")] });
    }
    // Check Challenger Inventory
    const invChallenger = await prisma_1.default.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(message.author.id, message.guild.id)), shopItemId: shopItem.id } }
    });
    if (!invChallenger || invChallenger.amount < 1) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Missing Item", `You need a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }
    // Check Target Inventory
    const invTarget = await prisma_1.default.inventory.findUnique({
        where: { userId_shopItemId: { userId: (await getUserId(targetUser.id, message.guild.id)), shopItemId: shopItem.id } }
    });
    if (!invTarget || invTarget.amount < 1) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Opponent Missing Item", `${targetUser.username} needs a ${EMOJI_CHICKEN} **Chicken** to fight!`)] });
    }
    // Check Challenger Balance
    const challengerBank = await prisma_1.default.bank.findUnique({ where: { userId: (await getUserId(message.author.id, message.guild.id)) } });
    const challengerWallet = await prisma_1.default.wallet.findUnique({ where: { userId: (await getUserId(message.author.id, message.guild.id)) } });
    // Logic: Usually betting comes from Wallet based on other commands 
    const userBal = challengerWallet?.balance || 0;
    if (userBal < betAmount) {
        return message.reply({ embeds: [(0, embed_1.errorEmbed)(message.author, "Insufficient Funds", `You only have **${userBal}** in your wallet.`)] });
    }
    // PHASE 2: Challenge Request
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
            // Defer immediately to prevent "Unknown interaction" if DB calls are slow
            try {
                await i.deferUpdate();
            }
            catch (e) {
                gameStarted = false; // Reset if interaction failed
                return;
            }
            // Re-check balances and items just in case
            const targetDbId = await getUserId(targetUser.id, message.guild.id);
            const challengerDbId = await getUserId(message.author.id, message.guild.id);
            // Check Target Balance
            const targetWallet = await prisma_1.default.wallet.findUnique({ where: { userId: targetDbId } });
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
    collector.on("end", (collected, reason) => {
        if (reason === "time") {
            reply.edit({ content: "Challenge expired.", components: [], embeds: [] }).catch(() => { });
        }
    });
}
// Ensure User Exists Helper
async function getUserId(discordId, guildId) {
    let user = await prisma_1.default.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } });
    if (!user) {
        user = await prisma_1.default.user.create({
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
async function runCockFight(originalMsg, gameMsg, p1, p2, bet, chickenItemId) {
    const guildId = originalMsg.guild.id;
    // DEDUCT FUNDS IMMEDIATELY
    const p1Id = await getUserId(p1.id, guildId);
    const p2Id = await getUserId(p2.id, guildId);
    await prisma_1.default.$transaction([
        prisma_1.default.wallet.update({ where: { userId: p1Id }, data: { balance: { decrement: bet } } }),
        prisma_1.default.wallet.update({ where: { userId: p2Id }, data: { balance: { decrement: bet } } })
    ]);
    let pot = bet * 2;
    // Added username to sideBets for display
    const sideBets = [];
    // PHASE 3: Side Betting
    const bettingEmbed = new discord_js_1.EmbedBuilder()
        .setColor("#FFFF00")
        .setTitle(`${EMOJI_CHICKEN} Betting Phase!`)
        .setDescription(`The fight is between **${p1.username}** vs **${p2.username}**!
    
    **Main Pot:** ${pot}
    
    Other players can place side bets now!
    **Side Bets Open for 60 seconds.**
    
    Click the buttons below to bet on a winner.`)
        .addFields({ name: `${p1.username}`, value: "No bets yet.", inline: true }, { name: `${p2.username}`, value: "No bets yet.", inline: true });
    const betRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId(`bet_p1`).setLabel(`Bet on ${p1.username}`).setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder().setCustomId(`bet_p2`).setLabel(`Bet on ${p2.username}`).setStyle(discord_js_1.ButtonStyle.Primary));
    await gameMsg.edit({ embeds: [bettingEmbed], components: [betRow] });
    const betCollector = gameMsg.createMessageComponentCollector({ componentType: discord_js_1.ComponentType.Button, time: 60000 });
    betCollector.on("collect", async (i) => {
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
            const amount = parseInt(submit.fields.getTextInputValue("amount"));
            if (isNaN(amount) || amount <= 0) {
                await submit.reply({ content: "Invalid amount.", ephemeral: true });
                return;
            }
            // Determine User
            const bettorDbId = await getUserId(submit.user.id, guildId);
            const bettorWallet = await prisma_1.default.wallet.findUnique({ where: { userId: bettorDbId } });
            if (!bettorWallet || bettorWallet.balance < amount) {
                await submit.reply({ content: "Insufficient funds in wallet.", ephemeral: true });
                return;
            }
            // Deduct Side Bet
            await prisma_1.default.wallet.update({ where: { userId: bettorDbId }, data: { balance: { decrement: amount } } });
            sideBets.push({ userId: submit.user.id, username: submit.user.username, amount, target });
            pot += amount;
            await submit.reply({ content: `Placed bet of **${amount}** on **${targetName}**!`, ephemeral: true });
            // Update Embed with Names
            const p1List = sideBets.filter(b => b.target === "p1").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";
            const p2List = sideBets.filter(b => b.target === "p2").map(b => `${b.username} (${b.amount})`).join("\n") || "No bets yet.";
            // Recalculate totals for display if needed, but names are requested
            const p1Total = sideBets.filter(b => b.target === "p1").reduce((a, b) => a + b.amount, 0);
            const p2Total = sideBets.filter(b => b.target === "p2").reduce((a, b) => a + b.amount, 0);
            bettingEmbed.setFields({ name: `${p1.username} (Total: ${p1Total})`, value: p1List, inline: true }, { name: `${p2.username} (Total: ${p2Total})`, value: p2List, inline: true });
            bettingEmbed.setDescription(`**Main Pot:** ${pot}\nSide Bets Open...`);
            await gameMsg.edit({ embeds: [bettingEmbed] });
        }
        catch (e) {
            // Modal timed out or error
        }
    });
    betCollector.on("end", async (collected, reason) => {
        // PHASE 4: Resolution
        const winnerIsP1 = Math.random() < 0.5;
        const winnerUser = winnerIsP1 ? p1 : p2;
        const loserUser = winnerIsP1 ? p2 : p1;
        const winnerKey = winnerIsP1 ? "p1" : "p2";
        // 1. Calculate Side Payouts
        const winningSideBets = sideBets.filter(b => b.target === winnerKey);
        let totalSidePayoutNeeded = 0;
        for (const b of winningSideBets) {
            totalSidePayoutNeeded += b.amount * 2;
        }
        // Safety Logic
        let sidePayoutRatio = 2.0;
        if (totalSidePayoutNeeded > pot) {
            sidePayoutRatio = pot / winningSideBets.reduce((a, b) => a + b.amount, 0);
            totalSidePayoutNeeded = pot;
        }
        const payoutOps = [];
        const mainWinnerPayout = pot - totalSidePayoutNeeded;
        // Track detailed winnings for embed
        const sideWinnersDetails = [];
        // Pay Side Winners
        for (const b of winningSideBets) {
            const payout = Math.floor(b.amount * sidePayoutRatio);
            const uId = await getUserId(b.userId, guildId);
            payoutOps.push(prisma_1.default.wallet.update({ where: { userId: uId }, data: { balance: { increment: payout } } }));
            sideWinnersDetails.push(`**${b.username}**: +${payout}`);
        }
        // Pay Main Winner
        if (mainWinnerPayout > 0) {
            const wId = await getUserId(winnerUser.id, guildId);
            payoutOps.push(prisma_1.default.wallet.update({ where: { userId: wId }, data: { balance: { increment: mainWinnerPayout } } }));
        }
        // Remove Loser Chicken
        const lId = await getUserId(loserUser.id, guildId);
        payoutOps.push(prisma_1.default.inventory.update({
            where: { userId_shopItemId: { userId: lId, shopItemId: chickenItemId } },
            data: { amount: { decrement: 1 } }
        }));
        await prisma_1.default.$transaction(payoutOps);
        // Detailed Result Embed construction
        let sideWinnersText = sideWinnersDetails.length > 0 ? sideWinnersDetails.join("\n") : "None";
        if (sideWinnersText.length > 1024)
            sideWinnersText = sideWinnersText.slice(0, 1020) + "..."; // safety
        const resultEmbed = new discord_js_1.EmbedBuilder()
            .setColor(winnerIsP1 ? "#00FF00" : "#FF0000")
            .setTitle(`${EMOJI_CHICKEN} Cock Fight Result`)
            .setDescription(`The dust settles...\n\n${EMOJI_WIN} **${winnerUser.username}** is the winner!\n${EMOJI_RIP} **${loserUser.username}**'s chicken has died.`)
            .addFields({ name: `${EMOJI_WIN} Main Winner`, value: `${winnerUser.username} won **${mainWinnerPayout}**!`, inline: false }, { name: `${EMOJI_WIN} Side Winners`, value: sideWinnersText, inline: false }, { name: "Stats", value: `Total Pot: ${pot}\nSide ROI: ${sidePayoutRatio.toFixed(2)}x`, inline: false });
        await gameMsg.edit({ embeds: [resultEmbed], components: [] });
    });
}
//# sourceMappingURL=cockfight.js.map