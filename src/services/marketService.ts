
import prisma from "../utils/prisma";
import { GuildConfig, MarketListing, ShopItem, User } from "@prisma/client";
import { getGuildConfig } from "./guildConfigService";
import { ensureBankForUser } from "./bankService";

// --- CORE MARKET LOGIC ---

/**
 * List an item on the black market.
 * Moves item from Inventory -> Escrow (Listing)
 */
export async function listItemOnMarket(discordId: string, guildId: string, shopItemId: string, amount: number, totalPrice: number) {
    if (amount <= 0 || totalPrice <= 0) throw new Error("Invalid amount or price.");

    // 1. Verify User
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new Error("User not found.");

    // 2. Verify Ownership & Quantity
    const inventoryItem = await prisma.inventory.findUnique({
        where: {
            userId_shopItemId: {
                userId: user.id,
                shopItemId
            }
        }
    });

    if (!inventoryItem || inventoryItem.amount < amount) {
        throw new Error("You do not have enough of this item to sell.");
    }

    // 3. Transaction: Remove from Inventory, Create Listing
    await prisma.$transaction(async (tx) => {
        // Decrement Inventory
        if (inventoryItem.amount === amount) {
            await tx.inventory.delete({ where: { id: inventoryItem.id } });
        } else {
            await tx.inventory.update({
                where: { id: inventoryItem.id },
                data: { amount: { decrement: amount } }
            });
        }

        // Create Listing
        await tx.marketListing.create({
            data: {
                guildId,
                sellerId: user.id,
                shopItemId,
                amount,
                totalPrice
            }
        });
    });

    return { success: true };
}

/**
 * Buy an item from the market.
 */
export async function buyItemFromMarket(buyerDiscordId: string, listingId: string) {
    // 1. Verify Listing
    // Since invalid ID formats crash prisma, let's validate or try/catch
    if (!listingId.match(/^[0-9a-fA-F]{24}$/)) throw new Error("Invalid Listing ID format.");

    const listing = await prisma.marketListing.findUnique({
        where: { id: listingId },
        include: { seller: true, shopItem: true }
    });

    if (!listing) throw new Error("Listing not found or already sold.");

    // 2. Verify Buyer
    const buyer = await prisma.user.findUnique({ where: { discordId: buyerDiscordId } });
    if (!buyer) throw new Error("Buyer not found.");

    if (buyer.id === listing.sellerId) throw new Error("You cannot buy your own listing.");

    // 3. Check Funds
    const buyerBank = await ensureBankForUser(buyerDiscordId);
    if (buyerBank.balance < listing.totalPrice) throw new Error(`Insufficient funds. Price: ${listing.totalPrice}`);

    // 4. Calculate Tax
    const config = await getGuildConfig(listing.guildId);
    const taxRate = config.marketTax || 5;
    const taxAmount = Math.floor(listing.totalPrice * (taxRate / 100));
    const sellerPayout = listing.totalPrice - taxAmount;

    // 5. Execute Exchange
    await prisma.$transaction(async (tx) => {
        // Buyer Pays
        await tx.bank.update({
            where: { id: buyerBank.id },
            data: { balance: { decrement: listing.totalPrice } }
        });

        // Seller Gets Paid
        // Note: Seller might not have a bank? Ensure it exists or update if exists.
        // For safety, we should ensure seller bank exists. 
        // But since they listed an item, they are a user.
        // Let's assume ensureBank logic usage or simple update if we trust constraints.
        // Safer to find bank.
        const sellerBank = await tx.bank.findUnique({ where: { userId: listing.sellerId } });
        if (sellerBank) {
            await tx.bank.update({
                where: { id: sellerBank.id },
                data: { balance: { increment: sellerPayout } }
            });
        } else {
            // Create bank for seller if missing (rare case)
            await tx.bank.create({
                data: { userId: listing.sellerId, balance: sellerPayout }
            });
        }

        // Buyer Gets Item
        // Check if buyer already has this item
        const existingInv = await tx.inventory.findUnique({
            where: {
                userId_shopItemId: {
                    userId: buyer.id,
                    shopItemId: listing.shopItemId
                }
            }
        });

        if (existingInv) {
            await tx.inventory.update({
                where: { id: existingInv.id },
                data: { amount: { increment: listing.amount } }
            });
        } else {
            await tx.inventory.create({
                data: {
                    userId: buyer.id,
                    guildId: listing.guildId,
                    shopItemId: listing.shopItemId,
                    amount: listing.amount
                }
            });
        }

        // Delete Listing
        await tx.marketListing.delete({ where: { id: listingId } });

        // Logs (Optional but good)
        // await tx.transaction.create(...)
    });

    return {
        success: true,
        item: listing.shopItem.name,
        amount: listing.amount,
        price: listing.totalPrice,
        tax: taxAmount
    };
}

/**
 * Get active listings with pagination
 */
export async function getMarketListings(guildId: string, page: number = 1, pageSize: number = 5) {
    const skip = (page - 1) * pageSize;

    const [listings, total] = await prisma.$transaction([
        prisma.marketListing.findMany({
            where: { guildId },
            include: { shopItem: true, seller: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize
        }),
        prisma.marketListing.count({ where: { guildId } })
    ]);

    return { listings, total, totalPages: Math.ceil(total / pageSize) };
}

/**
 * Get user's own listings
 */
export async function getUserListings(discordId: string) {
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) return [];

    return prisma.marketListing.findMany({
        where: { sellerId: user.id },
        include: { shopItem: true }
    });
}

/**
 * Cancel a listing
 */
export async function cancelListing(discordId: string, listingId: string) {
    if (!listingId.match(/^[0-9a-fA-F]{24}$/)) throw new Error("Invalid Listing ID.");

    const listing = await prisma.marketListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error("Listing not found.");

    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user || user.id !== listing.sellerId) throw new Error("You do not own this listing.");

    await prisma.$transaction(async (tx) => {
        // Return item to inventory
        const existingInv = await tx.inventory.findUnique({
            where: {
                userId_shopItemId: {
                    userId: user.id,
                    shopItemId: listing.shopItemId
                }
            }
        });

        if (existingInv) {
            await tx.inventory.update({
                where: { id: existingInv.id },
                data: { amount: { increment: listing.amount } }
            });
        } else {
            await tx.inventory.create({
                data: {
                    userId: user.id,
                    guildId: listing.guildId,
                    shopItemId: listing.shopItemId,
                    amount: listing.amount
                }
            });
        }

        // Delete Listing
        await tx.marketListing.delete({ where: { id: listingId } });
    });

    return { success: true };
}
