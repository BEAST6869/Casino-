// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  ////////////////////////////////////////////////
  // 1. DEFAULT INCOME CONFIGS
  ////////////////////////////////////////////////

  const incomeCommands = [
    { commandKey: "work",  minPay: 50, maxPay: 120, cooldown: 60, successPct: 100 },
    { commandKey: "beg",   minPay: 10, maxPay: 40,  cooldown: 45, successPct: 100 },
    { commandKey: "crime", minPay: 80, maxPay: 240, cooldown: 300, successPct: 50  },
    { commandKey: "slut",  minPay: 40, maxPay: 180, cooldown: 150, successPct: 75 }
  ];

  // This will seed for GUILD ID "GLOBAL_DEFAULT"
  // Your bot will override configs per-guild when admins run !setincome
  for (const cfg of incomeCommands) {
    await prisma.incomeConfig.upsert({
      where: {
        guildId_commandKey: {
          guildId: "GLOBAL_DEFAULT",
          commandKey: cfg.commandKey
        }
      },
      update: cfg,
      create: {
        guildId: "GLOBAL_DEFAULT",
        ...cfg
      }
    });
  }

  console.log("✔ Default income configs created!");

  ////////////////////////////////////////////////
  // 2. DEFAULT GAME SESSIONS (e.g., roulette)
  ////////////////////////////////////////////////
  await prisma.gameSession.upsert({
    where: { id: "roulette_default" },
    update: {},
    create: {
      id: "roulette_default",
      name: "Roulette",
      type: "roulette"
    }
  });

  // Add more games later if needed!

  console.log("✔ Default game session created!");


  ////////////////////////////////////////////////
  // 3. DONE
  ////////////////////////////////////////////////

  console.log("🌱 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
