"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeMessage = routeMessage;
const help_1 = require("./commands/general/help");
const setPrefix_1 = require("./commands/admin/setPrefix");
const setIncome_1 = require("./commands/admin/setIncome");
const addEmoji_1 = require("./commands/admin/addEmoji");
const setRob_1 = require("./commands/admin/setRob");
// economy
const balance_1 = require("./commands/economy/balance");
const deposit_1 = require("./commands/economy/deposit");
const withdrawBank_1 = require("./commands/economy/withdrawBank");
const transfer_1 = require("./commands/economy/transfer");
const incomeCommands_1 = require("./commands/economy/incomeCommands");
const rob_1 = require("./commands/economy/rob");
const shop_1 = require("./commands/economy/shop");
const inventory_1 = require("./commands/economy/inventory");
const profile_1 = require("./commands/economy/profile");
const leaderboard_1 = require("./commands/economy/leaderboard");
const bank_1 = require("./commands/economy/bank");
const market_1 = require("./commands/economy/market");
// admin
const addMoney_1 = require("./commands/admin/addMoney");
const setEconomyConfig_1 = require("./commands/admin/setEconomyConfig");
const setRoleIncome_1 = require("./commands/admin/setRoleIncome");
const removeMoney_1 = require("./commands/admin/removeMoney");
const collect_1 = require("./commands/economy/collect");
const setStartMoney_1 = require("./commands/admin/setStartMoney");
const setIncomeCooldown_1 = require("./commands/admin/setIncomeCooldown");
const resetEconomy_1 = require("./commands/admin/resetEconomy");
const setCurrency_1 = require("./commands/admin/setCurrency");
const setCurrencyEmoji_1 = require("./commands/admin/setCurrencyEmoji");
const viewConfig_1 = require("./commands/admin/viewConfig");
const addShopItem_1 = require("./commands/admin/addShopItem");
const manageShop_1 = require("./commands/admin/manageShop");
const setTheme_1 = require("./commands/general/setTheme");
const casinoBan_1 = require("./commands/admin/casinoBan");
const casinoUnban_1 = require("./commands/admin/casinoUnban");
const casinoBanList_1 = require("./commands/admin/casinoBanList");
const setGameCooldown_1 = require("./commands/admin/setGameCooldown");
const setLogChannel_1 = require("./commands/admin/setLogChannel");
// games
const roulette_1 = require("./commands/games/roulette");
const blackjack_1 = require("./commands/games/blackjack");
const coinflip_1 = require("./commands/games/coinflip");
const slots_1 = require("./commands/games/slots");
const setMinBet_1 = require("./commands/admin/setMinBet");
const prisma_1 = __importDefault(require("./utils/prisma"));
const embed_1 = require("./utils/embed");
async function routeMessage(client, message, prefix) {
    const raw = message.content.slice(1).trim();
    const [cmd, ...args] = raw.split(/\s+/);
    const command = cmd.toLowerCase();
    // Ban Check Middleware
    if (message.author.id) {
        const user = await prisma_1.default.user.findUnique({ where: { discordId: message.author.id } });
        if (user?.isBanned) {
            return message.reply({
                embeds: [(0, embed_1.errorEmbed)(message.author, "Banned", "🚫 You are banned from the casino.")]
            });
        }
    }
    // Aliases mapping
    const normalized = ({
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
        bj: "blackjack",
        "21": "blackjack"
    }[command] ?? command);
    switch (normalized) {
        case "addemoji":
            return (0, addEmoji_1.handleAddEmoji)(message, args);
        case "help":
            return (0, help_1.handleHelp)(message);
        case "setincome":
            return (0, setIncome_1.handleSetIncome)(message, args);
        case "setprefix":
            return (0, setPrefix_1.handleSetPrefix)(message, args);
        case "setrob":
        case "configrob":
            return (0, setRob_1.handleSetRob)(message, args);
        case "setcurrencyemoji":
        case "setemoji":
            return (0, setCurrencyEmoji_1.handleSetCurrencyEmoji)(message, args);
        // ----------------
        // Economy / User
        // ----------------
        case "balance":
            return (0, balance_1.handleBalance)(message);
        case "bank":
            return (0, bank_1.execute)(message, args);
        case "deposit":
            return (0, deposit_1.handleDeposit)(message, args);
        case "withdraw":
            return (0, withdrawBank_1.handleWithdrawBank)(message, args);
        case "transfer":
        case "give":
            return (0, transfer_1.handleTransfer)(message, args);
        case "collect":
            return (0, collect_1.handleCollectRoleIncome)(message, args);
        // Income
        case "work":
        case "crime":
        case "beg":
        case "slut":
            return (0, incomeCommands_1.handleIncome)(message);
        case "rob":
        case "steal":
            return (0, rob_1.handleRob)(message, args);
        // ----------------
        // Shop & Inventory
        // ----------------
        case "shop":
        case "store":
            return (0, shop_1.handleShop)(message, args);
        case "inventory":
            return (0, inventory_1.handleInventory)(message, args);
        case "profile":
        case "p":
        case "userinfo":
            return (0, profile_1.handleProfile)(message, args);
        // ----------------
        // Leaderboard & Levels
        // ----------------
        case "leaderboard":
            return (0, leaderboard_1.handleLeaderboard)(message, args);
        case "rank":
        case "level":
        case "lvl":
            const { rank } = require("./commands/general/rank");
            return rank(client, message, args);
        case "lb-wallet":
            return (0, leaderboard_1.handleLeaderboard)(message, ["cash"]);
        // ----------------
        // Games
        // ----------------
        case "bet":
            return (0, roulette_1.handleBet)(message, args);
        case "blackjack":
            return (0, blackjack_1.handleBlackjack)(message, args);
        case "coinflip":
            return (0, coinflip_1.handleCoinflip)(message, args);
        case "slots":
            return (0, slots_1.handleSlots)(message, args);
        // ----------------
        // Admin
        // ----------------
        case "addmoney":
        case "adminadd":
            return (0, addMoney_1.handleAddMoney)(message, args);
        case "removemoney":
        case "remove":
        case "takemoney":
            return (0, removeMoney_1.handleRemoveMoney)(message, args);
        case "setstartmoney":
        case "setstart":
            return (0, setStartMoney_1.handleSetStartMoney)(message, args);
        case "set-income-cooldown":
        case "set-income-cd":
            return (0, setIncomeCooldown_1.handleSetIncomeCooldown)(message, args);
        case "reseteconomy":
            return (0, resetEconomy_1.handleResetEconomy)(message, args);
        case "setcurrency":
            return (0, setCurrency_1.handleSetCurrency)(message, args);
        case "min-bet":
            return (0, setMinBet_1.handleSetMinBet)(message, args);
        case "adminviewconfig":
        case "viewconfig":
            return (0, viewConfig_1.handleAdminViewConfig)(message, args);
        // Shop Management
        case "shopadd":
        case "addshopitem":
            return (0, addShopItem_1.handleAddShopItem)(message, args);
        case "manageitem":
        case "edititem":
        case "delitem":
        case "editshop":
        case "deleteshop":
            return (0, manageShop_1.handleManageShop)(message, args);
        case "set-theme":
            return (0, setTheme_1.handleSetTheme)(message, args);
        case "casino-ban":
        case "banuser":
            return (0, casinoBan_1.handleCasinoBan)(message, args);
        case "casino-unban":
        case "unbanuser":
            return (0, casinoUnban_1.handleCasinoUnban)(message, args);
        case "casino-ban-list":
        case "banlist":
            return (0, casinoBanList_1.handleCasinoBanList)(message, args);
        case "bm":
        case "black-market":
            return (0, market_1.execute)(message, args);
        // Economy Configs
        case "set-loan-interest":
        case "setloan":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "loan");
        case "set-fd-interest":
        case "setfd":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "fd");
        case "set-rd-interest":
        case "setrd":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "rd");
        case "set-tax":
        case "settax":
        case "market-tax":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "tax");
        case "set-credit-reward":
        case "set-reward":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "credit-reward");
        case "set-credit-penalty":
        case "set-penalty":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "credit-penalty");
        case "set-credit-cap":
        case "credit-cap":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "credit-cap");
        case "set-max-loans":
        case "max-loans":
            return (0, setEconomyConfig_1.handleSetEconomyConfig)(message, args, "max-loans");
        case "view-credit-tiers":
        case "view-credit-config":
            const { handleViewCreditTiers } = require("./commands/admin/manageCreditConfig");
            return handleViewCreditTiers(message);
        case "delete-credit-tier":
        case "del-credit-tier":
            const { handleDeleteCreditTier } = require("./commands/admin/manageCreditConfig");
            return handleDeleteCreditTier(message, args);
        case "set-credit-score":
        case "set-score":
            const { handleSetCreditScore } = require("./commands/admin/manageCreditScore");
            return handleSetCreditScore(message, args);
        case "set-credit-config":
        case "credit-config":
            const { handleSetCreditConfig } = require("./commands/admin/setCreditConfig");
            return handleSetCreditConfig(message, args);
        case "credit":
        case "score":
        case "cscore":
            const { handleCredit } = require("./commands/economy/credit");
            return handleCredit(message, args);
        case "set-role-income":
            return (0, setRoleIncome_1.handleSetRoleIncome)(message, args);
        case "set-game-cooldown":
        case "game-cd":
            return (0, setGameCooldown_1.handleSetGameCooldown)(message, args);
        case "set-log-channel":
            return (0, setLogChannel_1.handleSetLogChannel)(message, args);
        // ----------------
        // Fallback
        // ----------------
        default:
            return message.reply(`Unknown command. Try: \`${prefix}bal\`, \`${prefix}shop\`, \`${prefix}inv\`, \`${prefix}help\`.`);
    }
}
//# sourceMappingURL=commandRouter.js.map