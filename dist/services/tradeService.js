"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTrade = executeTrade;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Execute a direct trade between two users.
 * @param sellerDiscordId The user SENDING the item.
 * @param buyerDiscordId The user RECEIVING the item (and PAYING if price > 0).
 * @param itemId The ShopItem ID to transfer.
 * @param quantity Amount of items to transfer.
 * @param price Total price for the transaction (0 for gift).
 */
async function executeTrade(sellerDiscordId, buyerDiscordId, itemId, quantity, price) {
    if (quantity <= 0)
        throw new Error("Quantity must be positive.");
    if (price < 0)
        throw new Error("Price cannot be negative.");
    return prisma_1.default.$transaction(async (tx) => {
        // 1. Fetch Users
        const seller = await tx.user.findUnique({ where: { discordId: sellerDiscordId }, include: { wallet: true } });
        const buyer = await tx.user.findUnique({ where: { discordId: buyerDiscordId }, include: { wallet: true } });
        if (!seller || !buyer)
            throw new Error("User not found.");
        if (!seller.wallet)
            throw new Error("Seller has no wallet.");
        if (!buyer.wallet)
            throw new Error("Buyer has no wallet."); // Buyer needs wallet to receive item too? Ideally yes.
        // 2. Validate Seller Inventory
        const inventory = await tx.inventory.findUnique({
            where: {
                userId_shopItemId: {
                    userId: seller.id,
                    shopItemId: itemId
                }
            },
            include: { shopItem: true }
        });
        if (!inventory || inventory.amount < quantity) {
            throw new Error("You do not have enough of this item to trade.");
        }
        // 3. Validate Buyer Balance (if paid)
        if (price > 0 && buyer.wallet.balance < price) {
            throw new Error(`Buyer doesn't have enough money (${price} required).`);
        }
        // 4. Money Transfer
        if (price > 0) {
            // Deduct Buyer
            await tx.wallet.update({
                where: { id: buyer.wallet.id },
                data: { balance: { decrement: price } }
            });
            // Add to Seller
            await tx.wallet.update({
                where: { id: seller.wallet.id },
                data: { balance: { increment: price } }
            });
            // Log Transaction
            await tx.transaction.create({
                data: {
                    walletId: buyer.wallet.id,
                    amount: -price,
                    type: "trade_payment",
                    meta: { to: sellerDiscordId, item: inventory.shopItem.name },
                    isEarned: false
                }
            });
        }
        // 5. Item Transfer
        // Remove from Seller
        if (inventory.amount === quantity) {
            await tx.inventory.delete({ where: { id: inventory.id } });
        }
        else {
            await tx.inventory.update({
                where: { id: inventory.id },
                data: { amount: { decrement: quantity } }
            });
        }
        // Add to Buyer
        await tx.inventory.upsert({
            where: {
                userId_shopItemId: {
                    userId: buyer.id,
                    shopItemId: itemId
                }
            },
            create: {
                guildId: inventory.guildId,
                userId: buyer.id,
                shopItemId: itemId,
                amount: quantity
            },
            update: {
                amount: { increment: quantity }
            }
        });
        return {
            success: true,
            item: inventory.shopItem.name,
            amount: quantity,
            price,
            buyerId: buyerDiscordId,
            sellerId: sellerDiscordId
        };
    });
}
//# sourceMappingURL=tradeService.js.map