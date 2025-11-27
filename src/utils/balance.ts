import prisma from "./prisma";
/**
 * Compute transferable balance for a wallet.
 * earnedTypes - set of txn.type considered as "earned"
 */
export async function getTransferableAmount(walletId: string) {
  // earned types
  const earnedTypes = ["income","job","game_win","payout"]; // adjust as you create them

  // sum of earned transactions
  const earnedAgg = await prisma.transaction.aggregate({
    where: { walletId, type: { in: earnedTypes } },
    _sum: { amount: true }
  });

  const earnedSum = (earnedAgg._sum.amount ?? 0);

  // sum of transfer outgoing already done
  const outAgg = await prisma.transaction.aggregate({
    where: { walletId, type: "transfer_sent" },
    _sum: { amount: true }
  });

  const transferredOut = (outAgg._sum.amount ?? 0);

  // If you want to allow transfers of earned + any unlocked balance, also add wallet.balance - totalBalanceFromEarned? But simplest:
  const transferable = Math.max(0, earnedSum - transferredOut);

  return { transferable, earnedSum, transferredOut };
}
