"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Fetching shop items...");
    const items = await prisma.shopItem.findMany();
    console.log(`Found ${items.length} total items.`);
    if (items.length === 0) {
        console.log("No items found in the database. The shop is empty.");
    }
    else {
        items.forEach(i => {
            console.log(`ID: ${i.id} | Name: '${i.name}' | Guild: ${i.guildId}`);
        });
    }
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=checkShopItems.js.map