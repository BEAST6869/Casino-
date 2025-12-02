import { Client, Message } from "discord.js";
import { handleHelp } from "./commands/general/help";
import { handleSetPrefix } from "./commands/admin/setPrefix";
import { handleSetIncome } from "./commands/admin/setIncome";
import { handleAddEmoji } from "./commands/admin/addEmoji";
import { handleSetRob } from "./commands/admin/setRob";

// economy
import { handleBalance } from "./commands/economy/balance";
import { handleDeposit } from "./commands/economy/deposit";
import { handleWithdrawBank } from "./commands/economy/withdrawBank";
import { handleTransfer } from "./commands/economy/transfer";
import { handleIncome } from "./commands/economy/incomeCommands";
import { handleRob } from "./commands/economy/rob";
import { handleShop } from "./commands/economy/shop";
import { handleInventory } from "./commands/economy/inventory";

// admin
import { handleAddMoney } from "./commands/admin/addMoney";
import { handleSetStartMoney } from "./commands/admin/setStartMoney";
import { handleSetIncomeCooldown } from "./commands/admin/setIncomeCooldown";
import { handleResetEconomy } from "./commands/admin/resetEconomy";
import { handleSetCurrency } from "./commands/admin/setCurrency";
import { handleSetCurrencyEmoji } from "./commands/admin/setCurrencyEmoji";
import { handleAdminViewConfig } from "./commands/admin/viewConfig";
import { handleAddShopItem } from "./commands/admin/addShopItem";
import { handleManageShop } from "./commands/admin/manageShop"; // <--- Import added

// games
import { handleBet } from "./commands/games/roulette";

export async function routeMessage(client: Client, message: Message) {
  const raw = message.content.slice(1).trim();
  const [cmd, ...args] = raw.split(/\s+/);
  const command = cmd.toLowerCase();

  // Aliases mapping
  const normalized = ((
    {
      dep: "deposit",
      depo: "deposit",
      bal: "balance",
      b: "balance",
      with: "withdraw",
      wd: "withdraw",
      add: "addmoney",
      adminadd: "addmoney",
      "setstart": "setstartmoney",
      inv: "inventory"
    } as Record<string, string>
  )[command] ?? command);

  switch (normalized) {
    case "addemoji":
      return handleAddEmoji(message, args);

    case "help":
      return handleHelp(message);

    case "setincome":
      return handleSetIncome(message, args);

    case "setprefix":
      return handleSetPrefix(message, args);
    
    case "setrob":
    case "configrob":
      return handleSetRob(message, args);

    case "setcurrencyemoji":
    case "setemoji":
      return handleSetCurrencyEmoji(message, args);

    // ----------------
    // Economy / User
    // ----------------
    case "balance":
      return handleBalance(message);

    case "deposit":
      return handleDeposit(message, args);

    case "withdraw":
      return handleWithdrawBank(message, args);

    case "transfer":
      return handleTransfer(message, args);

    // Income
    case "work":
    case "crime":
    case "beg":
    case "slut":
      return handleIncome(message);

    case "rob":
    case "steal":
      return handleRob(message, args);
      
    // ----------------
    // Shop & Inventory
    // ----------------
    case "shop":
    case "store":
      return handleShop(message, args);

    case "inventory":
      return handleInventory(message, args);

    // ----------------
    // Games
    // ----------------
    case "bet":
      return handleBet(message, args);

    // ----------------
    // Admin
    // ----------------
    case "addmoney":
    case "adminadd":
      return handleAddMoney(message, args);

    case "setstartmoney":
    case "setstart":
      return handleSetStartMoney(message, args);

    case "setincomecooldown":
      return handleSetIncomeCooldown(message, args);

    case "reseteconomy":
      return handleResetEconomy(message, args);

    case "setcurrency":
      return handleSetCurrency(message, args);

    case "adminviewconfig":
    case "viewconfig":
      return handleAdminViewConfig(message, args);
    
    // Shop Management
    case "shopadd":
    case "addshopitem":
      return handleAddShopItem(message, args);

    case "manageitem":
    case "edititem":
    case "delitem":
      return handleManageShop(message, args);

    // ----------------
    // Fallback
    // ----------------
    default:
      return message.reply(
        "Unknown command. Try: `!bal`, `!shop`, `!inv`, `!help`."
      );
  }
}