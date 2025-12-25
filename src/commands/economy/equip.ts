import { Message, EmbedBuilder } from "discord.js";
import prisma from "../../utils/prisma";
import { errorEmbed } from "../../utils/embed";
import { getGuildConfig } from "../../services/guildConfigService";

export async function handleEquip(message: Message, args: string[]) {
    if (!message.guild || !message.member) return;
    const config = await getGuildConfig(message.guild.id);
    const itemName = args.join(" ");

    if (!itemName) {
        return message.reply({ embeds: [errorEmbed(message.author, "Invalid Usage", `Usage: \`${config.prefix}equip <item name>\``)] });
    }

    const guildId = message.guild.id;
    const user = message.author;

    // 1. Get User
    const userData = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId: user.id, guildId } }
    });
    if (!userData) return message.reply("User not found.");

    // 2. Find Item in Inventory
    const shopItem = await prisma.shopItem.findFirst({
        where: { guildId, name: { equals: itemName, mode: "insensitive" } }
    });

    if (!shopItem) return message.reply({ embeds: [errorEmbed(user, "Item Not Found", "That item does not exist via shop.")] });

    const invItem = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: userData.id, shopItemId: shopItem.id } }
    });

    if (!invItem || invItem.amount < 1) {
        return message.reply({ embeds: [errorEmbed(user, "Missing Item", `You do not own **${shopItem.name}**.`)] });
    }

    // 3. Check if Equippable (Allow list for now)
    const validEquips = ["spurs", "armor", "shield", "helmet", "gloves"];
    if (!validEquips.some(e => shopItem.name.toLowerCase().includes(e))) {
        return message.reply({ embeds: [errorEmbed(user, "Not Equippable", "This item cannot be equipped to a chicken.")] });
    }

    // 4. Get Chicken
    const chickenItem = await prisma.shopItem.findFirst({ where: { name: { equals: "Chicken", mode: "insensitive" }, guildId } });
    if (!chickenItem) return message.reply("Chicken not configured.");

    const chickenInv = await prisma.inventory.findUnique({
        where: { userId_shopItemId: { userId: userData.id, shopItemId: chickenItem.id } }
    });

    if (!chickenInv || chickenInv.amount < 1) {
        return message.reply({ embeds: [errorEmbed(user, "No Chicken", "You need a chicken to equip items!")] });
    }

    // 5. Equip
    const meta = (chickenInv.meta as any) || {};
    const oldEquip = meta.equipped ? meta.equipped : "None";

    // Simple slot system: Just one "equipped" slot for simplicity as requested "equip items... Spurs"
    // Or maybe specific slots? Let's just use "equipped" array or string.
    // User asked "Equip items to boost effectiveness", "Spurs".
    // I'll stick to a single slot "equippedItem" or a list "equipment".
    // For simplicity: One main equipment slot for now OR logic to handle multiple.
    // Let's use an array `equipment: []`.

    let equipment: string[] = meta.equipment || [];

    // If it's the same type, replace? Hard to know type without config.
    // Let's just add it, max 1.
    // Actually, "Spurs" imply a weapon.
    // Let's simplified: `equippedItem` = ID.

    meta.equippedItem = shopItem.id;
    meta.equippedItemName = shopItem.name;

    await prisma.inventory.update({
        where: { id: chickenInv.id },
        data: { meta }
    });

    const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle(`⚔️ Equipped ${shopItem.name}`)
        .setDescription(`**${shopItem.name}** has been equipped to your chicken!`)
        .addFields({ name: "Previous Equipment", value: oldEquip !== "None" ? (meta.equippedItemName || "Unknown") : "None" });

    return message.reply({ embeds: [embed] });
}
