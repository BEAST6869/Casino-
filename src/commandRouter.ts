import { Client, Message } from "discord.js";
import { handleHelp } from "./commands/general/help";
import { handleSetPrefix } from "./commands/admin/setPrefix";
import { handleSetIncome } from "./commands/admin/setIncome";
import { handleAddEmoji } from "./commands/admin/addEmoji";
import { handleSetRobConfig } from "./commands/admin/setRob";

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
import { execute as handleBank } from "./commands/economy/bank";
import { execute as handleMarket } from "./commands/economy/market";
import { handleBankInteraction } from "./handlers/bankInteractionHandler";
import { handleMarketInteraction } from "./handlers/marketInteractionHandler";

// admin
import { handleAddMoney } from "./commands/admin/addMoney";
import { handleSetEconomyConfig } from "./commands/admin/setEconomyConfig";
import { handleSetRoleIncome } from "./commands/admin/setRoleIncome";
import { handleRemoveMoney } from "./commands/admin/removeMoney";
import { handleCollectRoleIncome } from "./commands/economy/collect";
import { handleSetStartMoney } from "./commands/admin/setStartMoney";
import { handleSetIncomeCooldown } from "./commands/admin/setIncomeCooldown";
import { handleResetEconomy } from "./commands/admin/resetEconomy";
import { handleSetCurrency } from "./commands/admin/setCurrency";
import { handleSetCurrencyEmoji } from "./commands/admin/setCurrencyEmoji";
import { handleAdminViewConfig } from "./commands/admin/viewConfig";
import { handleAddShopItem } from "./commands/admin/addShopItem";
import { handleManageShop } from "./commands/admin/manageShop";
import { handleSetTheme } from "./commands/general/setTheme";
import { handleCasinoBan } from "./commands/admin/casinoBan";
import { handleCasinoUnban } from "./commands/admin/casinoUnban";
import { handleCasinoBanList } from "./commands/admin/casinoBanList";
import { handleSetGameCooldown } from "./commands/admin/setGameCooldown";
import { handleSetLogChannel } from "./commands/admin/setLogChannel";

// games
import { handleBet } from "./commands/games/roulette";
import { handleBlackjack } from "./commands/games/blackjack";
import { handleCoinflip } from "./commands/games/coinflip";
import { handleSlots } from "./commands/games/slots";
import { handleSetMinBet } from "./commands/admin/setMinBet";
import prisma from "./utils/prisma";
import { errorEmbed } from "./utils/embed";
import { findBestMatch } from "./utils/stringUtils";

export async function routeMessage(client: Client, message: Message, prefix: string) {
  const raw = message.content.slice(1).trim();
  const [cmd, ...args] = raw.split(/\s+/);
  const command = cmd.toLowerCase();

  // Ban Check Middleware
  if (message.author.id) {
    const user = await prisma.user.findUnique({ where: { discordId: message.author.id } });
    if (user?.isBanned) {
      return message.reply({
        embeds: [errorEmbed(message.author, "Banned", "🚫 You are banned from the casino.")]
      });
    }
  }

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
      add: "add-money",
      adminadd: "add-money",
      remove: "remove-money",
      take: "remove-money",
      "setstart": "set-start-money",
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
      bj: "blackjack",
      "21": "blackjack"
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
    case "set-rob":
      await handleSetRobConfig(message, args);
      break;

    case "setcurrencyemoji":
    case "setemoji":
      return handleSetCurrencyEmoji(message, args);

    // ----------------
    // Economy / User
    // ----------------
    case "balance":
      return handleBalance(message);

    case "bank":
      return handleBank(message, args);

    case "deposit":
      return handleDeposit(message, args);

    case "withdraw":
      return handleWithdrawBank(message, args);

    case "transfer":
    case "give":
      return handleTransfer(message, args);

    case "collect":
      return handleCollectRoleIncome(message, args);

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
    // Leaderboard & Levels
    // ----------------
    case "leaderboard":
      return handleLeaderboard(message, args);

    case "rank":
    case "level":
    case "lvl":
      const { rank } = require("./commands/general/rank");
      return rank(client, message, args);

    case "lb-wallet":
      return handleLeaderboard(message, ["cash"]);

    // ----------------
    // Games
    // ----------------
    case "bet":
      return handleBet(message, args);

    case "blackjack":
      return handleBlackjack(message, args);

    case "coinflip":
      return handleCoinflip(message, args);

    case "slots":
      return handleSlots(message, args);

    // ----------------
    // Admin
    // ----------------
    case "add-money":
    case "admin-add":
      return handleAddMoney(message, args);

    case "remove-money":
    case "remove":
    case "take-money":
      return handleRemoveMoney(message, args);

    case "set-start-money":
    case "set-start":
      return handleSetStartMoney(message, args);

    case "set-income-cooldown":
    case "set-income-cd":
      return handleSetIncomeCooldown(message, args);

    case "reset-economy":
      return handleResetEconomy(message, args);

    case "set-currency":
      return handleSetCurrency(message, args);

    case "min-bet":
      return handleSetMinBet(message, args);

    case "admin-view-config":
    case "view-config":
      return handleAdminViewConfig(message, args);

    // Shop Management
    case "shop-add":
    case "add-shop-item":
      return handleAddShopItem(message, args);

    case "manage-item":
    case "edit-item":
    case "del-item":
    case "edit-shop":
    case "delete-shop":
      return handleManageShop(message, args);

    case "set-theme":
      return handleSetTheme(message, args);

    case "casino-ban":
    case "ban-user":
      return handleCasinoBan(message, args);

    case "casino-unban":
    case "unban-user":
      return handleCasinoUnban(message, args);

    case "casino-ban-list":
    case "ban-list":
      return handleCasinoBanList(message, args);

    case "bm":
    case "black-market":
      return handleMarket(message, args);

    // Economy Configs
    case "set-loan-interest":
    case "set-loan":
      return handleSetEconomyConfig(message, args, "loan");

    case "set-bank-limit":
      return handleSetEconomyConfig(message, args, "bank-limit");

    case "set-wallet-limit":
      return handleSetEconomyConfig(message, args, "wallet-limit");

    case "set-fd-interest":
    case "set-fd":
      return handleSetEconomyConfig(message, args, "fd");

    case "set-rd-interest":
    case "set-rd":
      return handleSetEconomyConfig(message, args, "rd");

    case "set-tax":
    case "market-tax":
      return handleSetEconomyConfig(message, args, "tax");

    case "set-credit-reward":
    case "set-reward":
      return handleSetEconomyConfig(message, args, "credit-reward");

    case "set-credit-penalty":
    case "set-penalty":
      return handleSetEconomyConfig(message, args, "credit-penalty");

    case "set-credit-cap":
    case "credit-cap":
      return handleSetEconomyConfig(message, args, "credit-cap");

    case "set-min-credit-cap":
    case "min-credit-cap":
      return handleSetEconomyConfig(message, args, "min-credit-cap");

    case "set-max-loans":
    case "max-loans":
      return handleSetEconomyConfig(message, args, "max-loans");

    case "credit":
    case "score":
      const { handleCredit } = require("./commands/economy/credit");
      return handleCredit(message, args);

    case "set-credit-score":
      const { handleSetCreditScore } = require("./commands/admin/manageCreditScore");
      return handleSetCreditScore(message, args);

    case "add-credit-tier":
      const { handleAddCreditTier } = require("./commands/admin/addCreditTier");
      return handleAddCreditTier(message, args);

    case "config-credit-tier":
    case "config-credit":
    case "edit-credit-tier":
      const { handleConfigCreditTier } = require("./commands/admin/configCreditTier");
      return handleConfigCreditTier(message, args);

    case "view-credit-tiers":
    case "view-credit-config":
      const { handleViewCreditTiers } = require("./commands/admin/manageCreditConfig");
      return handleViewCreditTiers(message);

    case "delete-credit-tier":
    case "del-credit-tier":
      const { handleDeleteCreditTier } = require("./commands/admin/manageCreditConfig");
      return handleDeleteCreditTier(message, args);

    case "ask-money":
      const { handleAsk } = require("./commands/economy/ask");
      return handleAsk(message, args);

    case "toggle-ask-money":
      // Map "off" / "disable" -> "0", everything else "1" (enable)
      let val = "1";
      if (args[0]?.toLowerCase() === "off" || args[0]?.toLowerCase() === "disable") val = "0";
      return handleSetEconomyConfig(message, [val], "toggle-ask");

    // ----------------
    // Fallback
    // ----------------
    // ----------------
    // Fallback & Suggestions
    // ----------------
    default:
      // Valid Commands List for Suggestions
      const VALID_COMMANDS = [
        "balance", "bank", "deposit", "withdraw", "transfer", "collect",
        "work", "crime", "beg", "slut", "rob", "shop", "inventory", "profile",
        "leaderboard", "rank", "bet", "blackjack", "coinflip", "slots",
        "add-money", "remove-money", "set-start-money", "reset-economy", "set-currency",
        "min-bet", "viewconfig", "shopadd", "manageitem", "set-theme",
        "casino-ban", "casino-unban", "banlist", "black-market",
        "set-loan-interest", "set-fd-interest", "set-rd-interest", "set-tax",
        "set-credit-reward", "set-credit-penalty", "set-credit-cap",
        "set-min-credit-cap", "set-max-loans", "credit", "set-credit",
        "add-credit-tier", "config-credit-tier", "view-credit-tiers", "delete-credit-tier",
        "ask-money", "toggle-ask-money", "config-rob", "add-emoji", "set-income-cd", "set-prefix",
        "set-currency-emoji"
      ];

      const bestMatch = findBestMatch(command, VALID_COMMANDS);

      if (bestMatch) {
        return message.reply({
          embeds: [errorEmbed(message.author, "Unknown Command", `Did you mean \`${prefix}${bestMatch}\`?`)]
        });
      }

      return message.reply(
        `Unknown command. Try: \`${prefix}bal\`, \`${prefix}shop\`, \`${prefix}inv\`, \`${prefix}help\`.`
      );
  }
}