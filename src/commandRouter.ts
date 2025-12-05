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
import { handleProfile } from "./commands/economy/profile";
import { handleLeaderboard } from "./commands/economy/leaderboard";

// admin
import { handleAddMoney } from "./commands/admin/addMoney";
import { handleRemoveMoney } from "./commands/admin/removeMoney"; 
import { handleSetStartMoney } from "./commands/admin/setStartMoney";
import { handleSetIncomeCooldown } from "./commands/admin/setIncomeCooldown";
import { handleResetEconomy } from "./commands/admin/resetEconomy";
import { handleSetCurrency } from "./commands/admin/setCurrency";
import { handleSetCurrencyEmoji } from "./commands/admin/setCurrencyEmoji";
import { handleAdminViewConfig } from "./commands/admin/viewConfig";
import { handleAddShopItem } from "./commands/admin/addShopItem";
import { handleManageShop } from "./commands/admin/manageShop";

// games
import { handleBet } from "./commands/games/roulette";
import { handleBlackjack } from "./commands/games/blackjack"; 
import { handleCoinflip } from "./commands/games/coinflip";
import { handleSlots } from "./commands/games/slots";
import { handleSetMinBet } from "./commands/admin/setMinBet";

export async function routeMessage(client: Client, message: Message) {
  const raw = message.content.slice(1).trim();
  const [cmd, ...args] = raw.split(/\s+/);
  const command = cmd.toLowerCase();

  // Aliases mapping
  const normalized = ((
    {
      dep: "deposit",
      depo: "deposit",
      me: "profile",
      userinfo: "profile",
      p: "profile",
      bal: "balance",
      b: "balance",
      with: "withdraw",
      wd: "withdraw",
      add: "addmoney",
      adminadd: "addmoney",
      remove: "removemoney",
      take: "removemoney",
      "setstart": "setstartmoney",
      inv: "inventory",
      lb: "leaderboard",
      top: "leaderboard",
      rich: "leaderboard",
      "lb-wallet": "lb-wallet",
      lbwallet: "lb-wallet",
      cashlb: "lb-wallet",
      roulette: "bet", 
      roul: "bet",
      cf: "coinflip",
      bj: "blackjack", // <--- Alias
      "21": "blackjack" // <--- Alias
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

    case "profile":
    case "p":
    case "userinfo":
      return handleProfile(message, args);

    // ----------------
    // Leaderboard
    // ----------------
    case "leaderboard":
      return handleLeaderboard(message, args);

    case "lb-wallet":
      return handleLeaderboard(message, ["cash"]);

    // ----------------
    // Games
    // ----------------
    case "bet":
      return handleBet(message, args);

    case "blackjack": // <--- Case
      return handleBlackjack(message, args);

    case "coinflip": // <--- Case
      return handleCoinflip(message, args);

    case "slots": // <--- Case
      return handleSlots  (message, args);

    // ----------------
    // Admin
    // ----------------
    case "addmoney":
    case "adminadd":
      return handleAddMoney(message, args);

    case "removemoney":
    case "remove":
    case "takemoney":
      return handleRemoveMoney(message, args);

    case "setstartmoney":
    case "setstart":
      return handleSetStartMoney(message, args);

    case "setincomecooldown":
      return handleSetIncomeCooldown(message, args);

    case "reseteconomy":
      return handleResetEconomy(message, args);

    case "setcurrency":
      return handleSetCurrency(message, args);

    case "min-bet":
      return handleSetMinBet(message, args);

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
    case "editshop":
    case "deleteshop":
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