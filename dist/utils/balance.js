"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransferableAmount = getTransferableAmount;
const prisma_1 = __importDefault(require("./prisma"));
async function getTransferableAmount(walletId) {
    const earnedTypes = ["income", "job", "game_win", "payout"];
    const earnedAgg = await prisma_1.default.transaction.aggregate({
        where: { walletId, type: { in: earnedTypes } },
        _sum: { amount: true }
    });
    const earnedSum = (earnedAgg._sum.amount ?? 0);
    const outAgg = await prisma_1.default.transaction.aggregate({
        where: { walletId, type: "transfer_sent" },
        _sum: { amount: true }
    });
    const transferredOut = (outAgg._sum.amount ?? 0);
    const transferable = Math.max(0, earnedSum - transferredOut);
    return { transferable, earnedSum, transferredOut };
}
//# sourceMappingURL=balance.js.map