"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShopItems = getShopItems;
exports.getShopItemByName = getShopItemByName;
exports.createShopItem = createShopItem;
exports.updateShopItem = updateShopItem;
exports.deleteShopItem = deleteShopItem;
exports.buyItem = buyItem;
exports.getUserInventory = getUserInventory;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function getShopItems(guildId) {
    return prisma_1.default.shopItem.findMany({ where: { guildId } });
}
async function getShopItemByName(guildId, name) {
    return prisma_1.default.shopItem.findFirst({
        where: {
            guildId,
            name: { equals: name, mode: "insensitive" }
        }
    });
}
async function createShopItem(guildId, name, price, description, roleId) {
    return prisma_1.default.shopItem.create({
        data: {
            guildId,
            name,
            price,
            description: description || "No description",
            roleId,
            stock: -1
        }
    });
}
async function updateShopItem(guildId, itemId, data) {
    return prisma_1.default.shopItem.update({
        where: { id: itemId },
        data
    });
}
async function deleteShopItem(itemId) {
    return prisma_1.default.shopItem.delete({ where: { id: itemId } });
}
async function buyItem(guildId, userId, itemName) {
    const item = await prisma_1.default.shopItem.findFirst({
        where: {
            guildId,
            name: { equals: itemName, mode: "insensitive" }
        }
    });
    if (!item)
        throw new Error("Item not found.");
    if (item.stock !== -1 && item.stock <= 0)
        throw new Error("Out of stock.");
    return prisma_1.default.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
            where: { discordId_guildId: { discordId: userId, guildId } },
            include: { wallet: true }
        });
        if (!user || !user.wallet || user.wallet.balance < item.price) {
            throw new Error(`You need ${item.price} coins to buy this.`);
        }
        await tx.wallet.update({
            where: { id: user.wallet.id },
            data: { balance: { decrement: item.price } }
        });
        if (item.stock !== -1) {
            await tx.shopItem.update({
                where: { id: item.id },
                data: { stock: { decrement: 1 } }
            });
        }
        await tx.inventory.upsert({
            where: { userId_shopItemId: { userId: user.id, shopItemId: item.id } },
            create: { guildId, userId: user.id, shopItemId: item.id, amount: 1 },
            update: { amount: { increment: 1 } }
        });
        await tx.transaction.create({
            data: {
                walletId: user.wallet.id,
                amount: -item.price,
                type: "shop_buy",
                meta: { itemName: item.name },
                isEarned: false
            }
        });
        return item;
    });
}
async function getUserInventory(discordId, guildId) {
    const user = await prisma_1.default.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    });
    if (!user)
        return [];
    return prisma_1.default.inventory.findMany({
        where: {
            guildId,
            userId: user.id
        },
        include: { shopItem: true }
    });
}
//# sourceMappingURL=shopService.js.map