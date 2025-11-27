// src/services/incomeService.ts
import prisma from "../utils/prisma";
import { checkCooldown } from "../utils/cooldown";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getIncomeConfigOrDefault(guildId: string | null, commandKey: string) {
  if (!guildId) return { minPay: 10, maxPay: 50, cooldown: 60, successPct: 100 };
  const cfg = await prisma.incomeConfig.findUnique({
    where: { guildId_commandKey: { guildId, commandKey } }
  });
  if (cfg) return cfg;
  return { minPay: 10, maxPay: 50, cooldown: 60, successPct: 100 };
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

  const amount = rand(cfg.minPay, cfg.maxPay);
  let success = true;
  if ((cfg.successPct ?? 100) < 100) success = Math.random() * 100 < (cfg.successPct ?? 100);

  if (!success) {
    const penalty = Math.floor(amount / 2);
    await prisma.$transaction([
      prisma.transaction.create({
        data: { walletId, amount: -penalty, type: `${commandKey}_fail`, meta: { penalty } }
      }),
      prisma.wallet.update({ where: { id: walletId }, data: { balance: { decrement: penalty } } })
    ]);
    return { success: false, amount: -penalty };
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: { walletId, amount, type: `${commandKey}_income`, meta: { commandKey }, isEarned: true }
    }),
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } })
  ]);

  return { success: true, amount };
}
