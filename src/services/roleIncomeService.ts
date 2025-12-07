
import prisma from "../utils/prisma";
import { ensureBankForUser } from "./bankService";

/**
 * Set income for a specific role (Admin).
 */
export async function setRoleIncome(guildId: string, roleId: string, amount: number, cooldownSeconds: number = 86400) {
    return await prisma.roleIncome.upsert({
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
export async function getRoleIncomes(guildId: string) {
    return await prisma.roleIncome.findMany({ where: { guildId } });
}

/**
 * Claim income for a user based on their roles.
 * @param discordId User's Discord ID
 * @param guildId Guild ID
 * @param roleIds Array of Role IDs the user currently has
 */
export async function claimRoleIncome(discordId: string, guildId: string, roleIds: string[]) {
    // 1. Get user (needed for ObjectId)
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new Error("User profile not found.");

    // 2. Find eligible incomes
    const eligibleIncomes = await prisma.roleIncome.findMany({
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
        const claim = await prisma.roleIncomeClaim.findUnique({
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
        await prisma.$transaction([
            prisma.bank.update({
                where: { userId: user.id },
                data: { balance: { increment: income.amount } }
            }),
            prisma.roleIncomeClaim.upsert({
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
