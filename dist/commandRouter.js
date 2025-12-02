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
// admin
const addMoney_1 = require("./commands/admin/addMoney");
const setStartMoney_1 = require("./commands/admin/setStartMoney");
const setIncomeCooldown_1 = require("./commands/admin/setIncomeCooldown");
const resetEconomy_1 = require("./commands/admin/resetEconomy");
const setCurrency_1 = require("./commands/admin/setCurrency");
const setCurrencyEmoji_1 = require("./commands/admin/setCurrencyEmoji");
const viewConfig_1 = require("./commands/admin/viewConfig");
const addShopItem_1 = require("./commands/admin/addShopItem");
// games
const roulette_1 = require("./commands/games/roulette");
async function routeMessage(client, message) {
    const raw = message.content.slice(1).trim();
    const [cmd, ...args] = raw.split(/\s+/);
    const command = cmd.toLowerCase();
    // Aliases mapping
    const normalized = ({
        dep: "deposit",
        depo: "deposit",
        bal: "balance",
        b: "balance",
        with: "withdraw",
        wd: "withdraw",
        add: "addmoney",
        adminadd: "addmoney",
        "setstart": "setstartmoney"
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
        // Income commands (work/crime/beg/slut)
        case "work":
        case "crime":
        case "beg":
        case "slut":
            return (0, incomeCommands_1.handleIncome)(message);
        case "rob":
        case "steal":
            return (0, rob_1.handleRob)(message, args);
        // ----------------
        // Shop
        // ----------------
        case "shop":
        case "store":
            return (0, shop_1.handleShop)(message, args);
        // ----------------
        // Games
        // ----------------
        case "bet":
            return (0, roulette_1.handleBet)(message, args);
        // ----------------
        // Admin
        // ----------------
        case "addmoney":
        case "adminadd":
            return (0, addMoney_1.handleAddMoney)(message, args);
        case "setstartmoney":
        case "setstart":
            return (0, setStartMoney_1.handleSetStartMoney)(message, args);
        case "setincomecooldown":
            return (0, setIncomeCooldown_1.handleSetIncomeCooldown)(message, args);
        case "reseteconomy":
            return (0, resetEconomy_1.handleResetEconomy)(message, args);
        case "setcurrency":
            return (0, setCurrency_1.handleSetCurrency)(message, args);
        case "adminviewconfig":
        case "viewconfig":
            return (0, viewConfig_1.handleAdminViewConfig)(message, args);
        case "shopadd":
        case "addshopitem":
            return (0, addShopItem_1.handleAddShopItem)(message, args);
        // ----------------
        // Fallback
        // ----------------
        default:
            return message.reply("Unknown command. Try: `!bal`, `!dep`, `!with`, `!work`, `!shop` or `!help`.");
    }
}
//# sourceMappingURL=commandRouter.js.map