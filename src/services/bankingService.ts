
import prisma from "../utils/prisma";
import { Loan, Investment, User, GuildConfig } from "@prisma/client";
import { ensureBankForUser } from "./bankService";
import { getGuildConfig } from "./guildConfigService";

// --- LOAN SYSTEM ---

/**
 * Apply for a loan.
 * Checks credit score and max loan limit.
 */
export async function applyForLoan(discordId: string, guildId: string, amount: number) {
    if (amount <= 0) throw new Error("Loan amount must be positive.");

    // Find User by DiscordID first
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new Error("User not found.");

    const userId = user.id; // Correct ObjectId

    // Check if user already has an active loan
    const activeLoan = await prisma.loan.findFirst({
        where: { userId, status: "ACTIVE" }
    });

    if (activeLoan) {
        throw new Error("You already have an active loan. Please repay it first.");
    }

    const config = await getGuildConfig(guildId);

    // Calculate max loan based on credit score if not fixed in config
    let maxLoan = config.loanMaxAmount || (user.creditScore * 10);

    if (amount > maxLoan) {
        throw new Error(`Loan denied. Your credit score allows a max loan of ${maxLoan}.`);
    }

    // Interest calculation
    const interestRate = config.loanInterestRate;
    const interestAmount = Math.floor(amount * (interestRate / 100));
    const totalRepayment = amount + interestAmount;

    // Due date (default 1 week)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Transaction: Credit Bank, Create Loan
    await prisma.$transaction([
        prisma.loan.create({
            data: {
                userId,
                amount,
                totalRepayment,
                interestRate,
                dueDate,
                status: "ACTIVE"
            }
        }),
        prisma.bank.update({
            where: { userId },
            data: { balance: { increment: amount } }
        }),
        prisma.transaction.create({
            data: {
                walletId: (await prisma.wallet.findUnique({ where: { userId } }))!.id, // Bit hacky, assumes wallet exists
                amount: amount,
                type: "loan_disbursal",
                meta: { type: "loan", amount }
            }
        })
    ]);

    return { amount, totalRepayment, dueDate, interestRate };
}

/**
 * Repay an active loan.
 */
export async function repayLoan(discordId: string, amount: number) {
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new Error("User not found.");
    const userId = user.id;

    const loan = await prisma.loan.findFirst({
        where: { userId, status: "ACTIVE" }
    });

    if (!loan) throw new Error("No active loan found.");

    const bank = await ensureBankForUser(discordId); // ensureBank uses discordId, so this is fine
    if (bank.balance < amount) {
        throw new Error("Insufficient bank balance. Please deposit money first using `!deposit`.");
    }

    let newStatus = "ACTIVE";
    let remaining = loan.totalRepayment - amount;
    let payAmount = amount;

    if (remaining <= 0) {
        newStatus = "PAID";
        payAmount = loan.totalRepayment; // Don't take more than needed
        remaining = 0;
    }

    await prisma.$transaction([
        prisma.bank.update({
            where: { id: bank.id },
            data: { balance: { decrement: payAmount } }
        }),
        prisma.loan.update({
            where: { id: loan.id },
            data: {
                totalRepayment: remaining,
                status: newStatus
            }
        }),
        // Bonus for full repayment: +Credit Score
        ...(newStatus === "PAID" ? [
            prisma.user.update({
                where: { id: userId },
                data: { creditScore: { increment: 10 } }
            })
        ] : [])
    ]);

    return { paid: payAmount, remaining, status: newStatus };
}

// --- INVESTMENT SYSTEM ---

/**
 * Create a Fixed Deposit (FD) or Recurring Deposit (RD)
 */
export async function createInvestment(discordId: string, guildId: string, type: "FD" | "RD", amount: number, durationDays: number) {
    if (amount <= 0) throw new Error("Amount must be positive.");

    // ensureBankForUser uses discordId
    const bank = await ensureBankForUser(discordId);
    if (bank.balance < amount) throw new Error("Insufficient bank balance.");

    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new Error("User not found.");
    const userId = user.id;

    const config = await getGuildConfig(guildId);
    const interestRate = type === "FD" ? config.fdInterestRate : config.rdInterestRate;

    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + durationDays);

    await prisma.$transaction([
        prisma.bank.update({
            where: { id: bank.id },
            data: { balance: { decrement: amount } }
        }),
        prisma.investment.create({
            data: {
                userId,
                type,
                amount,
                interestRate,
                maturityDate,
                status: "ACTIVE"
            }
        })
    ]);

    return { type, amount, interestRate, maturityDate };
}

/**
 * Process Investments (Check for maturity) - For User Interaction
 */
export async function checkMaturedInvestments(discordId: string) {
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) return []; // Or throw error?

    const userId = user.id;

    const investments = await prisma.investment.findMany({
        where: {
            userId,
            status: "ACTIVE",
            maturityDate: { lte: new Date() }
        }
    });

    const results = [];

    for (const inv of investments) {
        const interest = Math.floor(inv.amount * (inv.interestRate / 100));
        const payout = inv.amount + interest;

        await prisma.$transaction([
            prisma.investment.update({
                where: { id: inv.id },
                data: { status: "COMPLETED" }
            }),
            prisma.bank.update({
                where: { userId: inv.userId },
                data: { balance: { increment: payout } }
            })
        ]);
        results.push({ id: inv.id, payout, type: inv.type, interest });
    }

    return results;
}

/**
 * Process ALL matured investments (For Scheduler)
 */
export async function processAllInvestments() {
    const investments = await prisma.investment.findMany({
        where: {
            status: "ACTIVE",
            maturityDate: { lte: new Date() }
        }
    });

    let count = 0;
    for (const inv of investments) {
        const interest = Math.floor(inv.amount * (inv.interestRate / 100));
        const payout = inv.amount + interest;

        await prisma.$transaction([
            prisma.investment.update({
                where: { id: inv.id },
                data: { status: "COMPLETED" }
            }),
            prisma.bank.update({
                where: { userId: inv.userId },
                data: { balance: { increment: payout } }
            })
        ]);
        count++;
    }
    return count;
}

/**
 * Get financial summary for dashboard
 */
/**
 * Get financial summary for dashboard
 * @param discordId The Discord ID of the user
 */
export async function getFinancialSummary(discordId: string) {
    const user = await prisma.user.findUnique({
        where: { discordId },
        include: { bank: true, wallet: true } // Include wallet
    });

    // If user doesn't exist, return defaults or throw? 
    // Usually bank command is run by user, so return safe defaults or nulls.
    if (!user) {
        return {
            netWorth: 0,
            creditScore: 500,
            activeLoan: null,
            investments: []
        };
    }

    const loan = await prisma.loan.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    const investments = await prisma.investment.findMany({ where: { userId: user.id, status: "ACTIVE" } });

    // Calculate total investment value (Principal)
    const investmentValue = investments.reduce((sum, inv) => sum + inv.amount, 0);

    return {
        netWorth: (user.bank?.balance || 0) + (user.wallet?.balance || 0) + investmentValue,
        creditScore: user.creditScore,
        activeLoan: loan,
        investments
    };
}
