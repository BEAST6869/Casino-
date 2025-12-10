"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCreditLimits = calculateCreditLimits;
exports.applyForLoan = applyForLoan;
exports.repayLoan = repayLoan;
exports.createInvestment = createInvestment;
exports.checkMaturedInvestments = checkMaturedInvestments;
exports.processAllInvestments = processAllInvestments;
exports.getFinancialSummary = getFinancialSummary;
exports.processOverdueLoans = processOverdueLoans;
const prisma_1 = __importDefault(require("../utils/prisma"));
const bankService_1 = require("./bankService");
const guildConfigService_1 = require("./guildConfigService");
// --- CREDIT HELPERS ---
/**
 * Calculate credit limits based on config and user score
 */
function calculateCreditLimits(creditScore, config) {
    // Default Tiers if not configured
    const defaultTiers = [
        { minScore: 0, maxLoan: 5000, maxDays: 3 },
        { minScore: 500, maxLoan: 25000, maxDays: 7 },
        { minScore: 800, maxLoan: 100000, maxDays: 14 }
    ];
    const tiers = config.creditConfig?.length ? config.creditConfig : defaultTiers;
    // Sort tiers by minScore descending to find the highest matching tier
    tiers.sort((a, b) => b.minScore - a.minScore);
    const applicableTier = tiers.find((t) => creditScore >= t.minScore) || tiers[tiers.length - 1];
    // Use config.loanMaxAmount if set (override), otherwise use tier
    const maxLoan = config.loanMaxAmount || applicableTier.maxLoan;
    return {
        maxLoan,
        maxDays: applicableTier.maxDays,
        tier: applicableTier
    };
}
// --- LOAN SYSTEM ---
/**
 * Apply for a loan.
 * Checks credit score and max loan limit.
 */
async function applyForLoan(discordId, guildId, amount) {
    if (amount <= 0)
        throw new Error("Loan amount must be positive.");
    // Find User by DiscordID first
    const user = await prisma_1.default.user.findUnique({ where: { discordId } });
    if (!user)
        throw new Error("User not found.");
    const userId = user.id; // Correct ObjectId
    // Check active loans count
    const activeLoansCount = await prisma_1.default.loan.count({
        where: { userId, status: "ACTIVE" }
    });
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    // Default maxActiveLoans is 1 if not set
    const maxActiveLoans = config.maxActiveLoans || 1;
    if (activeLoansCount >= maxActiveLoans) {
        throw new Error(`You have reached the limit of ${maxActiveLoans} active loan(s). Please repay one first.`);
    }
    const limits = calculateCreditLimits(user.creditScore, config);
    if (amount > limits.maxLoan) {
        throw new Error(`Loan denied. Your credit score (${user.creditScore}) limits you to a max loan of ${limits.maxLoan}.`);
    }
    // Interest calculation
    const interestRate = config.loanInterestRate;
    const interestAmount = Math.floor(amount * (interestRate / 100));
    const totalRepayment = amount + interestAmount;
    // Due date based on Tier (supports fractional days)
    const dueDate = new Date(Date.now() + (limits.maxDays * 86400000));
    // Transaction: Credit Bank, Create Loan
    await prisma_1.default.$transaction([
        prisma_1.default.loan.create({
            data: {
                userId,
                amount,
                totalRepayment,
                interestRate,
                dueDate,
                status: "ACTIVE"
            }
        }),
        prisma_1.default.bank.update({
            where: { userId },
            data: { balance: { increment: amount } }
        }),
        prisma_1.default.transaction.create({
            data: {
                walletId: (await prisma_1.default.wallet.findUnique({ where: { userId } })).id, // Bit hacky, assumes wallet exists
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
async function repayLoan(discordId, guildId, amount) {
    const user = await prisma_1.default.user.findUnique({ where: { discordId } });
    if (!user)
        throw new Error("User not found.");
    const userId = user.id;
    // Find oldest active loan (FIFO)
    const loan = await prisma_1.default.loan.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" }
    });
    if (!loan)
        throw new Error("No active loan found.");
    const bank = await (0, bankService_1.ensureBankForUser)(discordId);
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
    // Config Logic
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    // Check if overdue
    const now = new Date();
    const isOverdue = now > loan.dueDate;
    let scoreChange = 0;
    if (newStatus === "PAID") {
        if (isOverdue) {
            // Late repayment penalty
            scoreChange = -(config.creditScorePenalty || 20);
        }
        else {
            // On-time repayment bonus
            scoreChange = (config.creditScoreReward || 10);
        }
    }
    await prisma_1.default.$transaction([
        prisma_1.default.bank.update({
            where: { id: bank.id },
            data: { balance: { decrement: payAmount } }
        }),
        prisma_1.default.loan.update({
            where: { id: loan.id },
            data: {
                totalRepayment: remaining,
                status: newStatus
            }
        }),
        // Update Credit Score
        ...(scoreChange !== 0 ? [
            prisma_1.default.user.update({
                where: { id: userId },
                data: {
                    creditScore: {
                        // If gaining score, clamp to max. If losing, just decrement (or clamp to 0? usually 0 is min)
                        // Prisma doesn't have min/max in atomic updates easily.
                        // We have to calculate new score in JS or use raw query.
                        // For simplicity, we can fetch user score, calc new score, and set it.
                        // But we want to avoid race conditions. 
                        // Ideally, we just increment and then clamp? No.
                        // We can't do conditional atomic increment based on max.
                        // Let's just do it in JS since we are in a transaction, but we didn't lock the user row.
                        // Revised approach:
                        // 1. We already fetched user at start.
                        // 2. We can calculate expected new credit score.
                        // 3. Clamp it.
                        set: Math.min(Math.max((user.creditScore + scoreChange), (config.minCreditScore || 0)), (config.maxCreditScore || 2000))
                    }
                }
            })
        ] : [])
    ]);
    return { paid: payAmount, remaining, status: newStatus };
}
// --- INVESTMENT SYSTEM ---
/**
 * Create a Fixed Deposit (FD) or Recurring Deposit (RD)
 */
async function createInvestment(discordId, guildId, type, amount, durationDays) {
    if (amount <= 0)
        throw new Error("Amount must be positive.");
    // ensureBankForUser uses discordId
    const bank = await (0, bankService_1.ensureBankForUser)(discordId);
    if (bank.balance < amount)
        throw new Error("Insufficient bank balance.");
    const user = await prisma_1.default.user.findUnique({ where: { discordId } });
    if (!user)
        throw new Error("User not found.");
    const userId = user.id;
    const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
    const interestRate = type === "FD" ? config.fdInterestRate : config.rdInterestRate;
    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + durationDays);
    await prisma_1.default.$transaction([
        prisma_1.default.bank.update({
            where: { id: bank.id },
            data: { balance: { decrement: amount } }
        }),
        prisma_1.default.investment.create({
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
async function checkMaturedInvestments(discordId) {
    const user = await prisma_1.default.user.findUnique({ where: { discordId } });
    if (!user)
        return []; // Or throw error?
    const userId = user.id;
    const investments = await prisma_1.default.investment.findMany({
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
        await prisma_1.default.$transaction([
            prisma_1.default.investment.update({
                where: { id: inv.id },
                data: { status: "COMPLETED" }
            }),
            prisma_1.default.bank.update({
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
async function processAllInvestments() {
    const investments = await prisma_1.default.investment.findMany({
        where: {
            status: "ACTIVE",
            maturityDate: { lte: new Date() }
        }
    });
    let count = 0;
    for (const inv of investments) {
        const interest = Math.floor(inv.amount * (inv.interestRate / 100));
        const payout = inv.amount + interest;
        await prisma_1.default.$transaction([
            prisma_1.default.investment.update({
                where: { id: inv.id },
                data: { status: "COMPLETED" }
            }),
            prisma_1.default.bank.update({
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
 * @param discordId The Discord ID of the user
 */
async function getFinancialSummary(discordId) {
    const user = await prisma_1.default.user.findUnique({
        where: { discordId },
        include: { bank: true, wallet: true } // Include wallet
    });
    // If user doesn't exist, return defaults or throw? 
    // Usually bank command is run by user, so return safe defaults or nulls.
    if (!user) {
        return {
            netWorth: 0,
            creditScore: 500,
            activeLoans: [],
            investments: []
        };
    }
    const activeLoans = await prisma_1.default.loan.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { createdAt: "asc" }
    });
    const investments = await prisma_1.default.investment.findMany({ where: { userId: user.id, status: "ACTIVE" } });
    // Calculate total investment value (Principal)
    const investmentValue = investments.reduce((sum, inv) => sum + inv.amount, 0);
    return {
        netWorth: (user.bank?.balance || 0) + (user.wallet?.balance || 0) + investmentValue,
        creditScore: user.creditScore,
        activeLoans,
        investments
    };
}
/**
 * Process Overdue Loans (Scheduler)
 * Automatically deducts from bank/wallet and applies penalty.
 */
async function processOverdueLoans(client) {
    const overdueLoans = await prisma_1.default.loan.findMany({
        where: {
            status: "ACTIVE",
            dueDate: { lt: new Date() }
        }
    });
    let count = 0;
    for (const loan of overdueLoans) {
        const user = await prisma_1.default.user.findUnique({ where: { id: loan.userId }, include: { bank: true, wallet: true } });
        if (!user)
            continue;
        // Find a mutual guild to determine config (Penalty/MinScore)
        // Since loans are global but config is per-guild, we try to find ONE guild they share.
        // Ideally we'd store guildId on the loan, but for now we look up.
        let guildId = null;
        for (const [gId, guild] of client.guilds.cache) {
            if (guild.members.cache.has(user.discordId) || (await guild.members.fetch(user.discordId).catch(() => null))) {
                guildId = gId;
                break;
            }
        }
        // Default config if no guild found (rare, or user left server)
        // We'll use default penalty 20, minScore 0 if defaults.
        let penalty = 20;
        let minScore = 0;
        if (guildId) {
            const config = await (0, guildConfigService_1.getGuildConfig)(guildId);
            penalty = config.creditScorePenalty;
            minScore = config.minCreditScore ?? 0;
        }
        // 1. FORCED DEDUCTION LOGIC
        // We deduct the FULL amount from the Bank, even if it goes negative.
        // This is "Overdraft".
        await prisma_1.default.bank.update({
            where: { userId: user.id },
            data: { balance: { decrement: loan.totalRepayment } }
        });
        // 2. STATUS UPDATE
        // Since we forced the payment (creating debt in bank), the loan itself is now settled.
        const newStatus = "PAID"; // Paid via forced overdraft
        // 3. APPLY PENALTY
        // Calculate new score respecting MIN CAP.
        const newScore = Math.max(user.creditScore - penalty, minScore);
        await prisma_1.default.$transaction([
            prisma_1.default.loan.update({
                where: { id: loan.id },
                data: {
                    status: newStatus,
                    totalRepayment: 0
                }
            }),
            prisma_1.default.user.update({
                where: { id: user.id },
                data: { creditScore: newScore }
            })
        ]);
        count++;
        console.log(`💸 Enforced repayment for ${user.username} (${user.discordId}). Deducted: ${loan.totalRepayment}, New Score: ${newScore}`);
    }
    return count;
}
//# sourceMappingURL=bankingService.js.map