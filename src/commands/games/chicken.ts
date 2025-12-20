
import { Message, EmbedBuilder } from "discord.js";
import prisma from "../../utils/prisma";
import { errorEmbed } from "../../utils/embed";

export async function handleChicken(message: Message, args: string[]) {
    const user = message.author;
    const guildId = message.guildId;

    if (!guildId) return;

    try {
        const userData = await prisma.user.findUnique({
            where: { discordId_guildId: { discordId: user.id, guildId } }
        });

        if (!userData) {
            return message.reply({ embeds: [errorEmbed(user, "Error", "User not found.")] });
        }

        // Find Chicken Item
        // We need to know the 'Chicken' shop item ID. 
        // We can search by name "Chicken"
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

        // Parse Stats
        const meta = (inventoryItem.meta as any) || {};
        const level = meta.level || 0;
        const wins = meta.wins || 0;
        const xp = meta.xp || 0;

        // Calculate Stats
        const score = 10 + (level * 2);

        // XP Bar
        const EMOJI_XP = "<:xpfull:1451636569982111765>";
        const EMOJI_XP_EMPTY = "<:xpempty:1451642829427314822>";
        const requiredXp = (level + 1) * 100;
        const filledBars = Math.floor((xp / requiredXp) * 10);
        const emptyBars = 10 - filledBars;
        const progressBar = `${EMOJI_XP.repeat(filledBars)}${EMOJI_XP_EMPTY.repeat(emptyBars)}`;

        // Win Estimates
        const getWinChance = (enemyLevel: number) => {
            const enemyScore = 10 + (enemyLevel * 2);
            return ((score / (score + enemyScore)) * 100).toFixed(1);
        };

        const EMOJI_CHICKEN = "<:cock:1451281426329768172>";

        const embed = new EmbedBuilder()
            .setColor("#FFD700") // Gold
            .setTitle(`${EMOJI_CHICKEN} ${user.username}'s Chicken`)
            .setThumbnail(user.displayAvatarURL())
            .setDescription(`Your fighting cock is ready for battle!`)
            .addFields(
                { name: "Level", value: `${level}`, inline: true },
                { name: "XP", value: `${progressBar} ${xp}/${requiredXp}`, inline: true },
                { name: "Wins", value: `${wins}`, inline: true },
                {
                    name: "Win Probabilities (Est.)", value: `
Vs Lvl 0: **${getWinChance(0)}%**
Vs Lvl 5: **${getWinChance(5)}%**
Vs Lvl 10: **${getWinChance(10)}%**
                `, inline: false
                }
            )
            .setFooter({ text: "Win fights to level up! Losing resets level to 0." });

        return message.reply({ embeds: [embed] });

    } catch (error) {
        console.error("Chicken Command Error:", error);
        return message.reply({ embeds: [errorEmbed(user, "System Error", "An error occurred while fetching chicken stats.")] });
    }
}
