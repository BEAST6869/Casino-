// src/utils/balanceUtils.ts
import prisma from "./prisma";

/**
 * Compute earned-only sums (useful for reporting).
 * Not used for gifting check because gifting is relaxed.
 */
export async function getEarnedSums(walletId: string) {
  const earnedAgg = await prisma.transaction.aggregate({
    where: { walletId, isEarned: true },
    _sum: { amount: true }
  });
  const earnedSum = earnedAgg._sum.amount ?? 0;

  const outAgg = await prisma.transaction.aggregate({
    where: { walletId, type: "transfer_sent" },
    _sum: { amount: true }
  });
  const transferredOut = outAgg._sum.amount ?? 0;

  const transferableEarned = Math.max(0, earnedSum - transferredOut);
  return { earnedSum, transferredOut, transferableEarned };
}
