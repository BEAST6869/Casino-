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
// --- Fetch Functions ---
/**
 * Fetch all shop items for a specific guild
 */
async function getShopItems(guildId) {
    return prisma_1.default.shopItem.findMany({ where: { guildId } });
}
/**
 * Fetch a single shop item by its exact name (case-insensitive)
 * Used by admin commands like !manageitem
 */
async function getShopItemByName(guildId, name) {
    return prisma_1.default.shopItem.findFirst({
        where: {
            guildId,
            name: { equals: name, mode: "insensitive" }
        }
    });
}
// --- Management Functions (Admin) ---
/**
 * Create a new shop item (Admin function)
 */
async function createShopItem(guildId, name, price, description, roleId) {
    return prisma_1.default.shopItem.create({
        data: {
            guildId,
            name,
            price,
            description: description || "No description",
            roleId,
            stock: -1 // Infinite by default for now
        }
    });
}
/**
 * Update a shop item by ID (Admin function)
 */
async function updateShopItem(guildId, itemId, data) {
    // We use updateMany as a safety check to ensure it belongs to the correct guild (though ID is unique)
    // Or simply update by ID. Prisma update works by unique ID.
    return prisma_1.default.shopItem.update({
        where: { id: itemId },
        data
    });
}
/**
 * Delete a shop item (Admin function)
 */
async function deleteShopItem(itemId) {
    return prisma_1.default.shopItem.delete({ where: { id: itemId } });
}
// --- User Action Functions ---
/**
 * Handle purchasing an item:
 * 1. Checks if item exists and has stock
 * 2. Checks if user has enough money
 * 3. Deducts money
 * 4. Adds item to user's inventory
 * 5. Logs the transaction
 */
async function buyItem(guildId, userId, itemName) {
    // 1. Find the item (Case insensitive search)
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
    // 2. Transaction: Deduct Money -> Add to Inventory -> Audit Log
    return prisma_1.default.$transaction(async (tx) => {
        // Check Balance
        const user = await tx.user.findUnique({ where: { discordId: userId }, include: { wallet: true } });
        if (!user || !user.wallet || user.wallet.balance < item.price) {
            throw new Error(`You need ${item.price} coins to buy this.`);
        }
        // Deduct Money
        await tx.wallet.update({
            where: { id: user.wallet.id },
            data: { balance: { decrement: item.price } }
        });
        // Decrement Stock (if not infinite)
        if (item.stock !== -1) {
            await tx.shopItem.update({
                where: { id: item.id },
                data: { stock: { decrement: 1 } }
            });
        }
        // Add to Inventory (Upsert = Create if new, Update if exists)
        await tx.inventory.upsert({
            where: { userId_shopItemId: { userId, shopItemId: item.id } },
            create: { guildId, userId, shopItemId: item.id, amount: 1 },
            update: { amount: { increment: 1 } }
        });
        // Log Transaction
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
/**
 * Get a user's inventory for a specific guild
 */
async function getUserInventory(userId, guildId) {
    return prisma_1.default.inventory.findMany({
        where: { userId, guildId },
        include: { shopItem: true }
    });
}
//# sourceMappingURL=shopService.js.map