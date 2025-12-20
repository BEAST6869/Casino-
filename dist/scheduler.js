"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const bankingService_1 = require("./services/bankingService");
const effectService_1 = require("./services/effectService");
function initScheduler(client) {
    node_cron_1.default.schedule("* * * * *", async () => {
        console.log("🕒 Running daily banking jobs...");
        try {
            const processedCount = await (0, bankingService_1.processAllInvestments)();
            console.log(`✅ Processed ${processedCount} matured investments.`);
            const loanCount = await (0, bankingService_1.processOverdueLoans)(client);
            if (loanCount > 0) {
                console.log(`✅ Processed ${loanCount} overdue loans.`);
            }
            await (0, effectService_1.removeTemporaryRoles)(client);
        }
        catch (err) {
            console.error("Scheduler error:", err);
        }
    });
    console.log("⏳ Banking scheduler initialized.");
}
//# sourceMappingURL=scheduler.js.map