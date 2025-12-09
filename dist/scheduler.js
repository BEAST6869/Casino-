"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("./utils/prisma"));
const bankingService_1 = require("./services/bankingService");
function initScheduler(client) {
    // Run every day at midnight
    node_cron_1.default.schedule("0 0 * * *", async () => {
        console.log("🕒 Running daily banking jobs...");
        try {
            // 1. Process Investments
            const processedCount = await (0, bankingService_1.processAllInvestments)();
            console.log(`✅ Processed ${processedCount} matured investments.`);
            // 2. Accrue Interest for Loans (simple logic: increment totalRepayment?)
            // We decided interest is fixed at start (Principal + Interest). So maybe just check due dates?
            const defaultedLoans = await prisma_1.default.loan.findMany({
                where: {
                    status: "ACTIVE",
                    dueDate: { lt: new Date() }
                }
            });
            for (const loan of defaultedLoans) {
                // Mark as defaulted or apply penalty
                // update credit score
                await prisma_1.default.user.update({
                    where: { id: loan.userId },
                    data: { creditScore: { decrement: 50 } }
                });
                console.log(`Loan ${loan.id} defaulted. User ${loan.userId} penalized.`);
            }
        }
        catch (err) {
            console.error("Scheduler error:", err);
        }
    });
    console.log("⏳ Banking scheduler initialized.");
}
//# sourceMappingURL=scheduler.js.map