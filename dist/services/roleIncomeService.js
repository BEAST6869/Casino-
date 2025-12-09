"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRoleIncome = setRoleIncome;
exports.getRoleIncomes = getRoleIncomes;
exports.claimRoleIncome = claimRoleIncome;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * Set income for a specific role (Admin).
 */
async function setRoleIncome(guildId, roleId, amount, cooldownSeconds = 86400) {
    return await prisma_1.default.roleIncome.upsert({
        where: {
            guildId_roleId: {
                guildId,
                roleId
            }
        },
        update: {
            amount,
            cooldown: cooldownSeconds
        },
        create: {
            guildId,
            roleId,
            amount,
            cooldown: cooldownSeconds
        }
    });
}
/**
 * Get all configured role incomes for a guild.
 */
async function getRoleIncomes(guildId) {
    return await prisma_1.default.roleIncome.findMany({ where: { guildId } });
}
/**
 * Claim income for a user based on their roles.
 * @param discordId User's Discord ID
 * @param guildId Guild ID
 * @param roleIds Array of Role IDs the user currently has
 */
async function claimRoleIncome(discordId, guildId, roleIds) {
    // 1. Get user (needed for ObjectId)
    const user = await prisma_1.default.user.findUnique({ where: { discordId } });
    if (!user)
        throw new Error("User profile not found.");
    // 2. Find eligible incomes
    const eligibleIncomes = await prisma_1.default.roleIncome.findMany({
        where: {
            guildId,
            roleId: { in: roleIds }
        }
    });
    if (eligibleIncomes.length === 0) {
        return { totalClaimed: 0, details: [] };
    }
    const results = [];
    let totalPayout = 0;
    // 3. Process each income
    for (const income of eligibleIncomes) {
        // Find existing claim to check cooldown
        const claim = await prisma_1.default.roleIncomeClaim.findUnique({
            where: {
                userId_roleIncomeId: {
                    userId: user.id,
                    roleIncomeId: income.id
                }
            }
        });
        const now = new Date();
        if (claim) {
            const nextClaim = new Date(claim.claimedAt.getTime() + income.cooldown * 1000);
            if (now < nextClaim) {
                // Too early
                continue;
            }
        }
        // 4. Pay User & Update Claim
        await prisma_1.default.$transaction([
            prisma_1.default.bank.update({
                where: { userId: user.id },
                data: { balance: { increment: income.amount } }
            }),
            prisma_1.default.roleIncomeClaim.upsert({
                where: {
                    userId_roleIncomeId: {
                        userId: user.id,
                        roleIncomeId: income.id
                    }
                },
                update: { claimedAt: now },
                create: {
                    userId: user.id,
                    roleIncomeId: income.id,
                    claimedAt: now
                }
            })
        ]);
        totalPayout += income.amount;
        results.push({ roleId: income.roleId, amount: income.amount });
    }
    return { totalClaimed: totalPayout, details: results };
}
//# sourceMappingURL=roleIncomeService.js.map