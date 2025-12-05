"use strict";
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
// admin
const addMoney_1 = require("./commands/admin/addMoney");
const removeMoney_1 = require("./commands/admin/removeMoney");
const setStartMoney_1 = require("./commands/admin/setStartMoney");
const setIncomeCooldown_1 = require("./commands/admin/setIncomeCooldown");
const resetEconomy_1 = require("./commands/admin/resetEconomy");
const setCurrency_1 = require("./commands/admin/setCurrency");
const setCurrencyEmoji_1 = require("./commands/admin/setCurrencyEmoji");
const viewConfig_1 = require("./commands/admin/viewConfig");
const addShopItem_1 = require("./commands/admin/addShopItem");
const manageShop_1 = require("./commands/admin/manageShop");
// games
const roulette_1 = require("./commands/games/roulette");
const blackjack_1 = require("./commands/games/blackjack");
const coinflip_1 = require("./commands/games/coinflip");
const slots_1 = require("./commands/games/slots");
const setMinBet_1 = require("./commands/admin/setMinBet");
async function routeMessage(client, message) {
    const raw = message.content.slice(1).trim();
    const [cmd, ...args] = raw.split(/\s+/);
    const command = cmd.toLowerCase();
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
        bj: "blackjack", // <--- Alias
        "21": "blackjack" // <--- Alias
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
        case "deposit":
            return (0, deposit_1.handleDeposit)(message, args);
        case "withdraw":
            return (0, withdrawBank_1.handleWithdrawBank)(message, args);
        case "transfer":
            return (0, transfer_1.handleTransfer)(message, args);
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
        // Leaderboard
        // ----------------
        case "leaderboard":
            return (0, leaderboard_1.handleLeaderboard)(message, args);
        case "lb-wallet":
            return (0, leaderboard_1.handleLeaderboard)(message, ["cash"]);
        // ----------------
        // Games
        // ----------------
        case "bet":
            return (0, roulette_1.handleBet)(message, args);
        case "blackjack": // <--- Case
            return (0, blackjack_1.handleBlackjack)(message, args);
        case "coinflip": // <--- Case
            return (0, coinflip_1.handleCoinflip)(message, args);
        case "slots": // <--- Case
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
        case "setincomecooldown":
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
        // ----------------
        // Fallback
        // ----------------
        default:
            return message.reply("Unknown command. Try: `!bal`, `!shop`, `!inv`, `!help`.");
    }
}
//# sourceMappingURL=commandRouter.js.map