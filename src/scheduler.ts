
import cron from "node-cron";
import prisma from "./utils/prisma";
import { checkMaturedInvestments, processAllInvestments, processOverdueLoans } from "./services/bankingService";
import { Client } from "discord.js";

export function initScheduler(client: Client) {
    // Run every day at midnight
    cron.schedule("* * * * *", async () => {
        console.log("🕒 Running daily banking jobs...");

        try {
            // 1. Process Investments
            const processedCount = await processAllInvestments();
            console.log(`✅ Processed ${processedCount} matured investments.`);

            // 2. Process Overdue Loans
            const loanCount = await processOverdueLoans(client);
            if (loanCount > 0) {
                console.log(`✅ Processed ${loanCount} overdue loans.`);
            }

        } catch (err) {
            console.error("Scheduler error:", err);
        }
    });

    console.log("⏳ Banking scheduler initialized.");
}
