// src/services/gameService.ts
import prisma from "../utils/prisma";

/**
 * Create a bet + transactions + update wallet using a transaction.
 * gameId should exist in GameSession.
 */
export async function placeBetWithTransaction(userId: string, walletId: string, gameId: string, amount: number, choice: string, didWin: boolean, payout: number) {
  const netChange = payout - amount;
  await prisma.$transaction(async (tx) => {
    await tx.bet.create({
      data: {
        userId,
        gameId,
        amount,
        choice,
        result: didWin ? "win" : "lose",
        payout
      }
    });

    await tx.transaction.create({
      data: {
        walletId,
        amount: netChange,
        type: didWin ? "payout" : "bet",
        meta: { choice, payout, didWin }
      }
    });

    await tx.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: netChange } }
    });
  });
}

/**
 * Fallback atomic bet for single-node mongo.
 */
export async function placeBetFallback(walletId: string, userId: string, gameId: string, amount: number, choice: string, didWin: boolean, payout: number) {
  // step 1: conditional decrement
  const res = await prisma.wallet.updateMany({
    where: { id: walletId, balance: { gte: amount } },
    data: { balance: { decrement: amount } }
  });
  if (res.count === 0) throw new Error("Insufficient funds during betting stage");

  // create bet & transaction
  await prisma.bet.create({
    data: { userId, gameId, amount, choice, result: didWin ? "win" : "lose", payout }
  });

  await prisma.transaction.create({
    data: { walletId, amount: didWin ? (payout) : -amount, type: didWin ? "payout" : "bet", meta: { choice, payout, didWin } }
  });

  if (didWin) {
    await prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: payout } } });
  }
}
