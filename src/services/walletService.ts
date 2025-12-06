import prisma from "../utils/prisma";

// User Cache: Stores which Discord IDs we have already verified exist
const userIdCache = new Map<string, string>();

/** ensure user exists (by discordId) and wallet exists */
export async function ensureUserAndWallet(discordId: string, username: string) {
  
  // 1. FAST: Check cache. If known, fetch full data including profileTheme
  if (userIdCache.has(discordId)) {
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { wallet: true } 
    });
    // Return immediately if found
    if (user && user.wallet) return user;
  }

  // 2. SLOW: If not in cache, check DB or Create
  // We use upsert to guarantee the user exists and has a wallet
  const user = await prisma.user.upsert({
    where: { discordId },
    update: { username }, // Update username if changed
    create: { 
      discordId, 
      username, 
      profileTheme: "cyberpunk", // Default theme
      wallet: { create: { balance: 1000 } } 
    },
    include: { wallet: true }
  });

  // 4. Update Cache
  userIdCache.set(discordId, user.id);

  return user;
}

export async function getWalletByDiscord(discordId: string) {
  const user = await prisma.user.findUnique({ where: { discordId }, include: { wallet: true } });
  return user?.wallet ?? null;
}

export async function getWalletById(walletId: string) {
  return prisma.wallet.findUnique({ where: { id: walletId } });
}

/** Admin deposit to wallet */
export async function depositToWallet(walletId: string, amount: number, meta: any = {}, earned = false) {
  await prisma.$transaction([
    prisma.transaction.create({ data: { walletId, amount, type: "deposit", meta, isEarned: earned } }),
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
  ]);
}

/** Admin remove from wallet */
export async function removeMoneyFromWallet(walletId: string, amount: number) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.balance < amount) throw new Error("Insufficient wallet funds.");

  await prisma.$transaction([
    prisma.transaction.create({ 
      data: { 
        walletId, 
        amount: -amount, 
        type: "admin_remove", 
        meta: { by: "admin" } 
      } 
    }),
    prisma.wallet.update({ 
      where: { id: walletId }, 
      data: { balance: { decrement: amount } } 
    })
  ]);
}