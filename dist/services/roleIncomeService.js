"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRoleIncome = setRoleIncome;
exports.getRoleIncomes = getRoleIncomes;
exports.claimRoleIncome = claimRoleIncome;
const prisma_1 = __importDefault(require("../utils/prisma"));
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
async function getRoleIncomes(guildId) {
    return await prisma_1.default.roleIncome.findMany({ where: { guildId } });
}
async function claimRoleIncome(discordId, guildId, roleIds) {
    const user = await prisma_1.default.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } });
    if (!user)
        throw new Error("User profile not found.");
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
    for (const income of eligibleIncomes) {
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
                continue;
            }
        }
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