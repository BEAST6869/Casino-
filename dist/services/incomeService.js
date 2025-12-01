"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIncomeConfigOrDefault = getIncomeConfigOrDefault;
exports.runIncomeCommand = runIncomeCommand;
// src/services/incomeService.ts
const prisma_1 = __importDefault(require("../utils/prisma"));
const cooldown_1 = require("../utils/cooldown");
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function getIncomeConfigOrDefault(guildId, commandKey) {
    if (!guildId) {
        return { minPay: 10, maxPay: 50, cooldown: 60, successPct: 100, failPenaltyPct: 50 };
    }
    const cfg = await prisma_1.default.incomeConfig.findUnique({
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
async function runIncomeCommand({ commandKey, discordId, guildId, userId, walletId }) {
    const cfg = await getIncomeConfigOrDefault(guildId, commandKey);
    const cooldownKey = `income:${guildId}:${discordId}:${commandKey}`;
    const cd = (0, cooldown_1.checkCooldown)(cooldownKey, cfg.cooldown);
    if (cd > 0)
        throw new Error(`Cooldown active. Try again in ${cd}s`);
    // pick amount
    const amount = rand(cfg.minPay, cfg.maxPay);
    // determine success
    const successPct = cfg.successPct ?? 100;
    const success = Math.random() * 100 < successPct;
    if (!success) {
        // calculate penalty as percentage of the attempted amount
        const penaltyPct = cfg.failPenaltyPct ?? 50;
        const penalty = Math.max(1, Math.floor((amount * penaltyPct) / 100));
        await prisma_1.default.$transaction([
            prisma_1.default.transaction.create({
                data: {
                    walletId,
                    amount: -penalty,
                    type: `${commandKey}_fail`,
                    meta: { penalty, attempted: amount, penaltyPct }
                }
            }),
            prisma_1.default.wallet.update({
                where: { id: walletId },
                data: { balance: { decrement: penalty } }
            })
        ]);
        return { success: false, amount: -penalty, penalty, attempted: amount };
    }
    // success: award amount (mark as earned)
    await prisma_1.default.$transaction([
        prisma_1.default.transaction.create({
            data: {
                walletId,
                amount,
                type: `${commandKey}_income`,
                meta: { commandKey },
                isEarned: true
            }
        }),
        prisma_1.default.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: amount } }
        })
    ]);
    return { success: true, amount };
}
//# sourceMappingURL=incomeService.js.map