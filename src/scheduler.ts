
import cron from "node-cron";
import prisma from "./utils/prisma";
import { checkMaturedInvestments, processAllInvestments } from "./services/bankingService";
import { Client } from "discord.js";

export function initScheduler(client: Client) {
    // Run every day at midnight
    cron.schedule("0 0 * * *", async () => {
        console.log("🕒 Running daily banking jobs...");

        try {
            // 1. Process Investments
            const processedCount = await processAllInvestments();
            console.log(`✅ Processed ${processedCount} matured investments.`);

            // 2. Accrue Interest for Loans (simple logic: increment totalRepayment?)
            // We decided interest is fixed at start (Principal + Interest). So maybe just check due dates?

            const defaultedLoans = await prisma.loan.findMany({
                where: {
                    status: "ACTIVE",
                    dueDate: { lt: new Date() }
                }
            });

            for (const loan of defaultedLoans) {
                // Mark as defaulted or apply penalty
                // update credit score
                await prisma.user.update({
                    where: { id: loan.userId },
                    data: { creditScore: { decrement: 50 } }
                });
                console.log(`Loan ${loan.id} defaulted. User ${loan.userId} penalized.`);
            }

        } catch (err) {
            console.error("Scheduler error:", err);
        }
    });

    console.log("⏳ Banking scheduler initialized.");
}
