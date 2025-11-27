// src/services/incomeService.ts
import prisma from "../utils/prisma";
import { checkCooldown } from "../utils/cooldown";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getIncomeConfigOrDefault(guildId: string | null, commandKey: string) {
  if (!guildId) {
    return { minPay: 10, maxPay: 50, cooldown: 60, successPct: 100, failPenaltyPct: 50 };
  }

  const cfg = await prisma.incomeConfig.findUnique({
    where: { guildId_commandKey: { guildId, commandKey } }
  });

  if (cfg) {
    return {
      minPay: cfg.minPay,
      maxPay: cfg.maxPay,
      cooldown: cfg.cooldown,
      successPct: cfg.successPct ?? 100,
      failPenaltyPct: cfg.failPenaltyPct ?? 50
    };
  }

  return { minPay: 10, maxPay: 50, cooldown: 60, successPct: 100, failPenaltyPct: 50 };
}

export async function runIncomeCommand({
  commandKey,
  discordId,
  guildId,
  userId,
  walletId
}: {
  commandKey: string;
  discordId: string;
  guildId: string | null;
  userId: string;
  walletId: string;
}) {
  const cfg = await getIncomeConfigOrDefault(guildId, commandKey);

  const cooldownKey = `income:${guildId}:${discordId}:${commandKey}`;
  const cd = checkCooldown(cooldownKey, cfg.cooldown);
  if (cd > 0) throw new Error(`Cooldown active. Try again in ${cd}s`);

  // pick amount
  const amount = rand(cfg.minPay, cfg.maxPay);

  // determine success
  const successPct = cfg.successPct ?? 100;
  const success = Math.random() * 100 < successPct;

  if (!success) {
    // calculate penalty as percentage of the attempted amount
    const penaltyPct = cfg.failPenaltyPct ?? 50;
    const penalty = Math.max(1, Math.floor((amount * penaltyPct) / 100));

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          walletId,
          amount: -penalty,
          type: `${commandKey}_fail`,
          meta: { penalty, attempted: amount, penaltyPct }
        }
      }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: penalty } }
      })
    ]);

    return { success: false, amount: -penalty, penalty, attempted: amount };
  }

  // success: award amount (mark as earned)
  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        walletId,
        amount,
        type: `${commandKey}_income`,
        meta: { commandKey },
        isEarned: true
      }
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } }
    })
  ]);

  return { success: true, amount };
}
