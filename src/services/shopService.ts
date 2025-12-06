import prisma from "../utils/prisma";

// --- Fetch Functions ---

/**
 * Fetch all shop items for a specific guild
 */
export async function getShopItems(guildId: string) {
  return prisma.shopItem.findMany({ where: { guildId } });
}

/**
 * Fetch a single shop item by its exact name (case-insensitive)
 * Used by admin commands like !manageitem
 */
export async function getShopItemByName(guildId: string, name: string) {
  return prisma.shopItem.findFirst({
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
export async function createShopItem(guildId: string, name: string, price: number, description?: string, roleId?: string) {
  return prisma.shopItem.create({
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
export async function updateShopItem(guildId: string, itemId: string, data: Partial<{ name: string, price: number, description: string, stock: number, roleId: string }>) {
  // We use updateMany as a safety check to ensure it belongs to the correct guild (though ID is unique)
  // Or simply update by ID. Prisma update works by unique ID.
  return prisma.shopItem.update({
    where: { id: itemId },
    data
  });
}

/**
 * Delete a shop item (Admin function)
 */
export async function deleteShopItem(itemId: string) {
  return prisma.shopItem.delete({ where: { id: itemId } });
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
export async function buyItem(guildId: string, userId: string, itemName: string) {
  // 1. Find the item (Case insensitive search)
  const item = await prisma.shopItem.findFirst({
    where: { 
      guildId, 
      name: { equals: itemName, mode: "insensitive" } 
    }
  });

  if (!item) throw new Error("Item not found.");
  if (item.stock !== -1 && item.stock <= 0) throw new Error("Out of stock.");

  // 2. Transaction: Deduct Money -> Add to Inventory -> Audit Log
  return prisma.$transaction(async (tx) => {
    // Check Balance
    // Note: userId passed here is DiscordID. We must find the User record.
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
    // We use the User's internal ObjectId for the relation
    await tx.inventory.upsert({
      where: { userId_shopItemId: { userId: user.id, shopItemId: item.id } },
      create: { guildId, userId: user.id, shopItemId: item.id, amount: 1 },
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
 * FIX: Accepts Discord ID but queries via the User relation
 */
export async function getUserInventory(discordId: string, guildId: string) {
  // We can't query 'userId' directly with discordId because userId is an ObjectId.
  // Instead, we query where the related 'user' has the matching 'discordId'.
  return prisma.inventory.findMany({
    where: {
      guildId,
      user: {
        discordId: discordId
      }
    },
    include: { shopItem: true }
  });
}