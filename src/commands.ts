// src/commands.ts
import { Message } from "discord.js";
import prisma from "./utils/prisma";

export async function handleMessage(message: Message) {
  const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);
  const discordId = message.author.id;

  switch (cmd.toLowerCase()) {
    case "balance":
      return cmdBalance(message, discordId);
    case "deposit":
      return cmdDeposit(message, discordId, args);
    case "bet":
      // choose implementation: prefer transaction when available
      return cmdBet(message, discordId, args);
    default:
      return message.reply("Unknown command. Try `!balance`, `!deposit <amount>`, `!bet <amount> <choice>`");
  }
}

async function ensureUserAndWallet(discordId: string, username: string) {
  // create user + wallet if not exists, return user with wallet
  const user = await prisma.user.upsert({
    where: { discordId },
    update: { username },
    create: {
      discordId,
      username,
      wallet: { create: { balance: 1000 } } // starting tokens
    },
    include: { wallet: true }
  });

  return user;
}

async function cmdBalance(message: Message, discordId: string) {
  const user = await ensureUserAndWallet(discordId, message.author.tag);
  const balance = user.wallet?.balance ?? 0;
  await message.reply(`Your balance: ${balance}`);
}

async function cmdDeposit(message: Message, discordId: string, args: string[]) {
  const amount = Math.floor(Number(args[0] || 0));
  if (!amount || amount <= 0) { await message.reply("Enter a valid deposit amount."); return; }

  const user = await ensureUserAndWallet(discordId, message.author.tag);
  const walletId = user.wallet!.id;

  await prisma.$transaction([
    prisma.transaction.create({ data: { walletId, amount, type: "deposit", meta: { via: "manual" } } }),
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
  ]);

  const refreshed = await prisma.wallet.findUnique({ where: { id: walletId } });
  await message.reply(`Deposited ${amount}. New balance: ${refreshed?.balance ?? 0}`);
}

/* ---------- BET logic ---------- */

/**
 * Public command wrapper. This will attempt a transaction-based bet and fall back
 * to atomic fallback if transaction fails due to environment not supporting it.
 */
async function cmdBet(message: Message, discordId: string, args: string[]) {
  const amount = Math.floor(Number(args[0] || 0));
  const choice = args[1] ?? "default";

  if (!amount || amount <= 0) { await message.reply("Enter a valid bet amount."); return; }

  const user = await ensureUserAndWallet(discordId, message.author.tag);
  const wallet = user.wallet!;
  if (!wallet) { await message.reply("Wallet not found. Try again."); return; }

  // Quick local check
  if (wallet.balance < amount) { await message.reply("Insufficient funds."); return; }

  // Game simulation (example): 50% win, 2x payout
  const didWin = Math.random() < 0.5;
  const payout = didWin ? amount * 2 : 0;
  const netChange = payout - amount; // positive if win, negative if loss

  // Try transaction first (recommended). If it errors because transactions unsupported, fallback.
  try {
    await betWithTransaction(user.id, wallet.id, amount, choice, didWin, payout, netChange);
  } catch (e) {
    console.warn("Transaction bet failed, attempting fallback:", (e as Error).message);
    try {
      await betFallbackAtomic(wallet.id, user.id, amount, choice, didWin, payout, netChange);
    } catch (err) {
      console.error("Fallback bet failed:", err);
      await message.reply("Bet failed due to internal error.");
      return;
    }
  }

  const newWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
  const newBal = newWallet?.balance ?? 0;
  if (didWin) {
    await message.reply(`You won! Payout ${payout}. New balance: ${newBal}`);
  } else {
    await message.reply(`You lost ${amount}. New balance: ${newBal}`);
  }
}

/**
 * Recommended: multi-document transaction (requires MongoDB replica set / Atlas)
 */
async function betWithTransaction(userId: string, walletId: string, amount: number, choice: string, didWin: boolean, payout: number, netChange: number) {
  await prisma.$transaction(async (tx) => {
    await tx.bet.create({
      data: {
        userId,
        gameId: "roulette_id_placeholder",
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
 * Fallback for single-node Mongo (no multi-doc transactions).
 * Strategy:
 * 1) atomically decrement wallet if sufficient funds using updateMany (conditional)
 * 2) create Bet and Transaction documents afterwards. NOTE: not perfectly atomic across docs.
 *
 * This reduces the risk of overspend, but there is a small window where process crashes before bet/txn are written.
 */
async function betFallbackAtomic(walletId: string, userId: string, amount: number, choice: string, didWin: boolean, payout: number, netChange: number) {
  // Step 1: conditional decrement
  const res = await prisma.wallet.updateMany({
    where: { id: walletId, balance: { gte: amount } },
    data: { balance: { decrement: amount } } // remove bet amount first
  });

  if (res.count === 0) {
    throw new Error("Insufficient funds at update stage");
  }

  // At this point bet amount removed. If player loses, netChange is -amount and we're done.
  // If player wins, need to add payout difference (payout - amount).
  // Step 2: create bet and transaction
  await prisma.bet.create({
    data: {
      userId,
      gameId: "roulette_id_placeholder",
      amount,
      choice,
      result: didWin ? "win" : "lose",
      payout
    }
  });

  await prisma.transaction.create({
    data: {
      walletId,
      amount: didWin ? (payout) - amount : -amount, // record net in a way consistent with your system
      type: didWin ? "payout" : "bet",
      meta: { choice, payout, didWin }
    }
  });

  // If win, credit the wallet the net win (payout).
  if (didWin) {
    await prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: payout } } });
    // Note: Because we decremented amount earlier, we increment payout to reflect giving payout back.
    // You can instead do increment by (payout) or by (payout - amount) depending how you recorded txn.
  }
}
