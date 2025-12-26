
import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction } from "discord.js";
import prisma from "../../utils/prisma";
import { errorEmbed } from "../../utils/embed";
import { getGuildConfig } from "../../services/guildConfigService";


export async function handleChicken(message: Message, args: string[]) {
    const subCommand = args[0]?.toLowerCase();

    if (subCommand === "name") {
        return handleName(message, args.slice(1));
    }


    if (subCommand === "top" || subCommand === "leaderboard") {
        return handleTop(message);
    }

    if (subCommand === "train") {
        return handleTrain(message, args.slice(1));
    }

    return handleView(message, args);
}

async function handleTop(message: Message) {
    const guildId = message.guildId!;
    const config = await getGuildConfig(guildId);

    const shopItem = await prisma.shopItem.findFirst({
        where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
    });

    if (!shopItem) return message.reply("Chicken item not configured in shop.");

    const chickens = await prisma.inventory.findMany({
        where: {
            shopItemId: shopItem.id,
            amount: { gte: 1 }
        },
        include: { user: true }
    });

    if (chickens.length === 0) {
        return message.reply("No chickens found on the leaderboard!");
    }

    const sorted = chickens.sort((a, b) => {
        const metaA = (a.meta as any) || {};
        const metaB = (b.meta as any) || {};

        const levelA = metaA.level || 0;
        const levelB = metaB.level || 0;
        const xpA = metaA.xp || 0;
        const xpB = metaB.xp || 0;

        if (levelA !== levelB) return levelB - levelA;
        return xpB - xpA;
    });

    const top10 = sorted.slice(0, 10);

    const EMOJI_TROPHY = "🏆";

    const description = top10.map((inv, index) => {
        const meta = (inv.meta as any) || {};
        const level = meta.level || 0;
        const wins = meta.wins || 0;
        const name = meta.name ? `"${meta.name}"` : "Chicken";

        let rankEmoji = `#${index + 1}`;
        if (index === 0) rankEmoji = "🥇";
        if (index === 1) rankEmoji = "🥈";
        if (index === 2) rankEmoji = "🥉";

        return `${rankEmoji} **${inv.user.username}** — ${name} (Lvl ${level} | ${wins} Wins)`;
    }).join("\n");

    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${EMOJI_TROPHY} Chicken Leaderboard`)
        .setDescription(description || "No active chickens.")
        .setFooter({ text: `Use ${config.prefix}chicken top to see this list.` });

    return message.reply({ embeds: [embed] });
}

async function handleName(message: Message, args: string[]) {
    const config = await getGuildConfig(message.guildId!);
    if (args.length < 1) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}chicken name <New Name>\``)] });
    }

    const newName = args.join(" ");
    if (newName.length > 30) {
        return message.reply({ embeds: [errorEmbed(message.author, "Name Too Long", "Chicken names must be under 30 characters.")] });
    }

    const guildId = message.guildId!;
    const user = message.author;

    const shopItem = await prisma.shopItem.findFirst({
        where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
    });

    if (!shopItem) return message.reply("Chicken item not configured in shop.");

    const userDb = await prisma.user.findFirst({ where: { discordId: user.id, guildId } });
    if (!userDb) return message.reply("User not found.");

    const inventoryItem = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: userDb.id, shopItemId: shopItem.id } }
    });

    if (!inventoryItem || inventoryItem.amount < 1) {
        return message.reply({ embeds: [errorEmbed(user, "No Chicken", "You need a chicken to name it!")] });
    }

    const meta = (inventoryItem.meta as any) || {};
    meta.name = newName;

    await prisma.inventory.update({
        where: { id: inventoryItem.id },
        data: { meta }
    });


    const EMOJI_CHICKEN = "<:cock:1451281426329768172>";
    const embed = new EmbedBuilder()
        .setColor("#FFD700")
        .setTitle(`${EMOJI_CHICKEN} Chicken Renamed!`)
        .setDescription(`Your chicken has been renamed to **${newName}**!`)
        .setFooter({ text: "May it fight with honor!" });

    return message.reply({ embeds: [embed] });
}

async function handleView(message: Message, args: string[]) {
    const user = message.author;
    const guildId = message.guildId;

    if (!guildId) return;

    try {
        const config = await getGuildConfig(guildId);
        const userData = await prisma.user.findUnique({
            where: { discordId_guildId: { discordId: user.id, guildId } }
        });

        if (!userData) {
            return message.reply({ embeds: [errorEmbed(user, "Error", "User not found.")] });
        }

        const shopItem = await prisma.shopItem.findFirst({
            where: { name: { equals: "Chicken", mode: "insensitive" }, guildId }
        });

        if (!shopItem) {
            return message.reply({ embeds: [errorEmbed(user, "Error", "The 'Chicken' item does not exist in the shop.")] });
        }

        const inventoryItem = await prisma.inventory.findUnique({
            where: { userId_shopItemId: { userId: userData.id, shopItemId: shopItem.id } }
        });

        if (!inventoryItem) {
            return message.reply({
                embeds: [errorEmbed(user, "No Chicken", "You do not own a chicken! Buy one from the shop.")]
            });
        }

        const meta = (inventoryItem.meta as any) || {};
        const level = meta.level || 0;

        // --- TRAINING CHECK ---
        const activeTraining = meta.training;
        if (activeTraining) {
            const now = Date.now();
            if (now >= activeTraining.endTime) {
                // Training Complete!
                // Clear state and award
                delete meta.training;
                const stat = activeTraining.stat;
                meta[stat] = (meta[stat] || 0) + 1;

                await prisma.inventory.update({
                    where: { id: inventoryItem.id },
                    data: { meta }
                });

                const embed = new EmbedBuilder()
                    .setColor("#00FF00")
                    .setTitle("<:cock:1451281426329768172> Training Complete!")
                    .setDescription(`Your chicken has finished training!\n\n**${stat.toUpperCase()}** +1`);

                return message.reply({ embeds: [embed] });
            } else {
                // Still Training
                const endTimeUnix = Math.floor(activeTraining.endTime / 1000);
                const embed = new EmbedBuilder()
                    .setColor("#3498db")
                    .setTitle("<:cock:1451281426329768172> Training Room")
                    .setDescription(`Your chicken is currently training **${activeTraining.stat.toUpperCase()}**.\n\n⏳ Completes <t:${endTimeUnix}:R>`)
                    .setFooter({ text: "You cannot fight while training." });

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("train_wakeup").setLabel("Wake Up (Cancel)").setStyle(ButtonStyle.Danger)
                );

                const reply = await message.reply({ embeds: [embed], components: [row] });

                // --- AUTO COMPLETE LOGIC ---
                const msRemaining = activeTraining.endTime - Date.now();
                if (msRemaining > 0 && msRemaining < 2147483647) { // SetTimeout limit check
                    setTimeout(async () => {
                        try {
                            // 1. Double check state (in case canceled)
                            const checkInv = await prisma.inventory.findUnique({ where: { id: inventoryItem.id } });
                            const checkMeta = (checkInv?.meta as any) || {};
                            if (!checkMeta.training) return; // Already done/canceled

                            // 2. Resolve
                            delete checkMeta.training;
                            const stat = activeTraining.stat;
                            checkMeta[stat] = (checkMeta[stat] || 0) + 1;

                            await prisma.inventory.update({
                                where: { id: inventoryItem.id },
                                data: { meta: checkMeta }
                            });

                            // 3. Edit Embed
                            const completeEmbed = new EmbedBuilder()
                                .setColor("#00FF00")
                                .setTitle("🎓 Training Complete!")
                                .setDescription(`Your chicken has finished training!\n\n**${stat.toUpperCase()}** +1`);

                            await reply.edit({ embeds: [completeEmbed], components: [] });

                        } catch (e) {
                            console.error("Auto-complete error:", e);
                        }
                    }, msRemaining);
                }
                // ---------------------------

                const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: msRemaining + 5000 }); // Collect until slightly after end
                collector.on("collect", async (i) => {
                    if (i.user.id !== user.id) return i.reply({ content: "Not your chicken.", ephemeral: true });

                    if (i.customId === "train_wakeup") {
                        // Cancel Logic
                        delete meta.training;
                        // Partial XP? Let's give 10 XP for effort.
                        meta.xp = (meta.xp || 0) + 10;

                        await prisma.inventory.update({
                            where: { id: inventoryItem.id },
                            data: { meta }
                        });

                        await i.update({
                            content: "Training Cancelled. You got 10 XP for the effort.",
                            embeds: [],
                            components: []
                        });
                        collector.stop();
                    }
                });
                return;
            }
        }
        // --- END TRAINING CHECK ---

        // --- INJURY CHECK ---
        const activeInjury = meta.injured;
        if (activeInjury) {
            const now = Date.now();
            if (now >= activeInjury.endTime) {
                // Auto-healed
                delete meta.injured;
                await prisma.inventory.update({ where: { id: inventoryItem.id }, data: { meta } });
                // Fallthrough to normal view
            } else {
                // Still Injured
                const endTimeUnix = Math.floor(activeInjury.endTime / 1000);
                const healCost = (config as any).chickenHealCost ?? 500;

                const embed = new EmbedBuilder()
                    .setColor("#E74C3C")
                    .setTitle("<:clinic:1453972244610154507> Veterinary Clinic")
                    .setDescription(`Your chicken is **Injured** and cannot fight or train.\n\n<a:bandaid:1453972442300154018> Recovers <t:${endTimeUnix}:R>`)
                    .addFields({ name: "Instant Heal", value: `Pay **${healCost}** coins to heal instantly.` });

                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("chicken_heal").setLabel(`Heal (${healCost})`).setStyle(ButtonStyle.Success).setEmoji("<:medicine:1453973645675200727>")
                );

                const reply = await message.reply({ embeds: [embed], components: [row] });

                const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
                collector.on("collect", async (i) => {
                    if (i.user.id !== user.id) return i.reply({ content: "Not your chicken.", ephemeral: true });

                    if (i.customId === "chicken_heal") {
                        try {
                            await prisma.$transaction(async (tx) => {
                                const u = await tx.user.findUnique({ where: { id: userData.id }, include: { wallet: true } });
                                if (!u || (u.wallet?.balance || 0) < healCost) {
                                    throw new Error("Insufficient funds");
                                }
                                await tx.wallet.update({
                                    where: { id: u.wallet!.id },
                                    data: { balance: { decrement: healCost } }
                                });

                                // Fetch latest to ensure still injured
                                const freshInv = await tx.inventory.findUnique({ where: { id: inventoryItem.id } });
                                const freshMeta = (freshInv?.meta as any) || {};
                                delete freshMeta.injured;

                                await tx.inventory.update({
                                    where: { id: inventoryItem.id },
                                    data: { meta: freshMeta }
                                });
                            });

                            await i.update({ content: "✅ Your chicken has been healed!", embeds: [], components: [] });
                        } catch (e) {
                            await i.reply({ content: `Heal failed. You might lack funds (${healCost}) or an error occurred.`, ephemeral: true });
                        }
                    }
                });
                return;
            }
        }
        // --------------------

        const wins = meta.wins || 0;
        const xp = meta.xp || 0;
        const chickenName = meta.name || `${user.username}'s Chicken`;

        const score = 10 + (level * 2);

        const EMOJI_XP = "<:xpfull:1451636569982111765>";
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const requiredXp = (level + 1) * 100;
        const filledBars = Math.floor((xp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;

        const getWinChance = (enemyLevel: number) => {
            const enemyScore = 10 + (enemyLevel * 2);
            return ((score / (score + enemyScore)) * 100).toFixed(1);
        };

        const EMOJI_CHICKEN = "<:cock:1451281426329768172>";

        const embed = new EmbedBuilder()
            .setColor("#FFD700")
            .setTitle(`${EMOJI_CHICKEN} ${chickenName}`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`**Level ${level}** Battle Chicken`)
            .addFields(
                { name: "Name", value: chickenName, inline: true },
                { name: "XP", value: `${progressBar} ${xp}/${requiredXp}`, inline: true },
                { name: "Wins", value: `${wins}`, inline: true },
                {
                    name: "Stats",
                    value: `
**Strength:** ${drawStatBar(meta.strength || 0)} ${meta.strength || 0}
**Agility:** ${drawStatBar(meta.agility || 0)} ${meta.agility || 0}
**Defense:** ${drawStatBar(meta.defense || 0)} ${meta.defense || 0}
`,
                    inline: false
                },
                {
                    name: "Win Probabilities (Est.)", value: `
Vs Lvl 0: **${getWinChance(0)}%**
Vs Lvl 5: **${getWinChance(5)}%**
Vs Lvl 10: **${getWinChance(10)}%**
`, inline: false
                }
            )
            .setFooter({ text: `Use ${config.prefix}chicken name <name> to rename!` });

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Chicken Command Error:", error);
        return message.reply({ embeds: [errorEmbed(user, "System Error", "An error occurred while fetching chicken stats.")] });
    }
}

function drawStatBar(value: number) {
    const max = 20; // Visual max
    const filled = Math.min(value, max); // Cap visual at 20 (can go higher numerically)
    const empty = max - filled;
    // Compress visuals: 1 block = 2 points? user requested "same xp bar style" which is 10 blocks.
    // Let's scale: value / 2 approx?
    // Actually XP bar is 10 blocks. Let's map 0-20 stat to 10 blocks.
    const EMOJI_FULL = "<:xpfull:1451636569982111765>";
    const EMOJI_EMPTY = "<:xpempty:1451642829427314822>";

    const blocks = 10;
    const filledBlocks = Math.min(Math.floor((value / max) * blocks), blocks);
    const emptyBlocks = blocks - filledBlocks;

    return `${EMOJI_FULL.repeat(filledBlocks)}${EMOJI_EMPTY.repeat(emptyBlocks)}`;
}

async function handleTrain(message: Message, args: string[]) {
    const stat = args[0]?.toLowerCase();
    const config = await getGuildConfig(message.guildId!);
    const validStats = ["strength", "agility", "defense"];

    if (!validStats.includes(stat)) {
        return message.reply({
            embeds: [errorEmbed(message.author, "Invalid Stat", `Usage: \`${config.prefix}chicken train <strength|agility|defense>\`\nValid stats: Strength, Agility, Defense.`)]
        });
    }

    const guildId = message.guildId!;
    const user = message.author;

    // 2. Get Chicken to Check Level
    const shopItem = await prisma.shopItem.findFirst({ where: { name: { equals: "Chicken", mode: "insensitive" }, guildId } });
    if (!shopItem) return message.reply("Chicken item missing.");

    const inv = await prisma.inventory.findUnique({ where: { userId_shopItemId: { userId: await getUserId(user.id, guildId), shopItemId: shopItem.id } } });
    if (!inv || inv.amount < 1) return message.reply({ embeds: [errorEmbed(user, "No Chicken", "You need a chicken to train!")] });

    const meta = (inv.meta as any) || {};

    // Check if already training or injured
    if (meta.training) {
        return message.reply(`Your chicken is already training! Check \`${config.prefix}chicken\`.`);
    }
    if (meta.injured) {
        return message.reply(`Your chicken is injured! Visit the \`${config.prefix}chicken\` dashboard to heal.`);
    }

    const level = meta.level || 0;

    const baseCost = (config as any).chickenTrainBaseCost || 500;
    const trainMult = (config as any).chickenTrainMultiplier || 0.5;

    // Dynamic Cost & Time
    const cost = Math.floor(baseCost * (1 + level * trainMult));
    const durationMins = Math.max(2, level * 1); // Min 2 mins, or Level * 1
    const durationMs = durationMins * 60 * 1000;

    // 1. Check Money
    const wallet = await prisma.wallet.findUnique({ where: { userId: inv.userId } });
    if (!wallet || wallet.balance < cost) {
        return message.reply({ embeds: [errorEmbed(user, "Insufficient Funds", `Training costs **${cost}**. You have **${wallet?.balance || 0}**.`)] });
    }

    const EMOJI_CHICKEN = "<:cock:1451281426329768172>";

    const confirmEmbed = new EmbedBuilder()
        .setColor("#FFA500")
        .setTitle(`${EMOJI_CHICKEN} Training: ${stat.toUpperCase()}`)
        .setDescription(`Training will boost **${stat}** permanently.\n\n**Cost:** ${cost} coins\n**Duration:** ${durationMins} minutes\n\nYour chicken will be unavailable for fights during this time.`)
        .setFooter({ text: "Confirm payment to start." });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("train_confirm").setLabel(`Pay ${cost} & Start`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("train_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    const reply = await message.reply({ embeds: [confirmEmbed], components: [row] });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on("collect", async (i) => {
        if (i.user.id !== user.id) return i.reply({ content: "Not your chicken.", ephemeral: true });

        if (i.customId === "train_cancel") {
            await i.update({ content: "Training cancelled.", embeds: [], components: [] });
            return;
        }

        if (i.customId === "train_confirm") {
            // Re-check funds transactionally
            try {
                await prisma.$transaction(async (tx) => {
                    const u = await tx.user.findUnique({ where: { id: inv.userId }, include: { wallet: true } });
                    if (!u || !u.wallet || u.wallet.balance < cost) {
                        throw new Error("Insufficient funds.");
                    }

                    await tx.wallet.update({
                        where: { id: u.wallet.id },
                        data: { balance: { decrement: cost } }
                    });

                    // Update Chicken Meta
                    const newMeta = JSON.parse(JSON.stringify(meta)); // Deep copy safer
                    newMeta.training = {
                        stat: stat,
                        endTime: Date.now() + durationMs
                    };

                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { meta: newMeta }
                    });
                });

                const endTimeUnix = Math.floor((Date.now() + durationMs) / 1000);

                await i.update({
                    content: null,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#00FF00")
                            .setTitle(`${EMOJI_CHICKEN} Training Started!`)
                            .setDescription(`Your chicken has entered the Training Room!\n\nCompletes <t:${endTimeUnix}:R>`)
                    ],
                    components: []
                });

                // --- AUTO COMPLETE LOGIC FOR START MESSAGE ---
                if (durationMs < 2147483647) {
                    setTimeout(async () => {
                        try {
                            // 1. Double check state (in case canceled)
                            const checkInv = await prisma.inventory.findUnique({ where: { id: inv.id } });
                            const checkMeta = (checkInv?.meta as any) || {};
                            if (!checkMeta.training) return; // Already done/canceled

                            // 2. Resolve (duplicate logic, but safe due to checkMeta.training check)
                            // Ideally we call a shared function, but for now duplicate to ensure visual update matches state.
                            // NOTE: If handleView resolved it first, checkMeta.training will be null.
                            // If WE count down, we update DB.

                            delete checkMeta.training;
                            const currentStatVal = checkMeta[stat] || 0;
                            // If it wasn't updated yet:
                            checkMeta[stat] = currentStatVal + 1;

                            await prisma.inventory.update({
                                where: { id: inv.id },
                                data: { meta: checkMeta }
                            });

                            // 3. Edit Embed
                            const completeEmbed = new EmbedBuilder()
                                .setColor("#00FF00")
                                .setTitle("🎓 Training Complete!")
                                .setDescription(`Your chicken has finished training!\n\n**${stat.toUpperCase()}** +1`);

                            await reply.edit({ embeds: [completeEmbed], components: [] });

                        } catch (e) {
                            // Ignore if already edited or permission lost
                        }
                    }, durationMs);
                }
                // ---------------------------------------------

            } catch (err) {
                await i.update({ content: "Transaction failed (Maybe insufficient funds).", embeds: [], components: [] });
            }
        }
    });
}

async function getUserId(discordId: string, guildId: string): Promise<string> {
    let user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } });
    if (!user) { // Should exist if they have a chicken, but safe check
        user = await prisma.user.create({ data: { discordId, guildId, username: "Unknown", wallet: { create: {} }, bank: { create: {} } } });
    }
    return user.id;
}
