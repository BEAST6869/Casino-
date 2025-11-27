// src/services/bankService.ts
import prisma from "../utils/prisma";

/** ensure bank row by user.id (prisma User.id) */
export async function ensureBankForUser(userId: string) {
  const bank = await prisma.bank.findUnique({ where: { userId } });
  if (bank) return bank;
  return prisma.bank.create({ data: { userId, balance: 0 } });
}

/** deposit from wallet -> bank (used by !deposit command) */
export async function depositToBank(walletId: string, userId: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be greater than 0.");
  const bank = await ensureBankForUser(userId);

  // Ensure wallet has funds
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new Error("Wallet not found.");
  if (wallet.balance < amount) throw new Error("Insufficient wallet balance.");

  await prisma.$transaction([
    prisma.transaction.create({
      data: { walletId, amount: -amount, type: "wallet_to_bank", meta: { toBank: true }, isEarned: false }
    }),
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } }),
    prisma.bank.update({ where: { id: bank.id }, data: { balance: { increment: amount } } }),
    prisma.audit.create({ data: { userId: wallet.userId, type: "bank_deposit", meta: { amount } } })
  ]);

  return bank;
}

/** withdraw from bank -> wallet */
export async function withdrawFromBank(walletId: string, userId: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be greater than 0.");
  const bank = await ensureBankForUser(userId);
  if (bank.balance < amount) throw new Error("Insufficient funds in bank.");

  await prisma.$transaction([
    prisma.transaction.create({
      data: { walletId, amount, type: "bank_to_wallet", meta: { fromBank: bank.id }, isEarned: false }
    }),
    prisma.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } }),
    prisma.bank.update({ where: { id: bank.id }, data: { balance: { decrement: amount } } }),
    prisma.audit.create({ data: { userId, type: "bank_withdraw", meta: { amount } } })
  ]);

  return bank;
}

export async function getBankByUserId(userId: string) {
  return prisma.bank.findUnique({ where: { userId } });
}
