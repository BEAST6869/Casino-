"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProfileImage = generateProfileImage;
exports.generateRankCard = generateRankCard;
const canvas_1 = require("canvas");
const discord_js_1 = require("discord.js");
const Styles = __importStar(require("./profileStyles"));
async function generateProfileImage(user, walletBal, bankBal, netWorth, avatarUrl, theme = "cyberpunk") {
    const width = 800;
    const height = 450;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext("2d");
    const data = {
        username: user.username.length > 12 ? user.username.substring(0, 12) + "..." : user.username,
        creditScore: user.creditScore,
        level: user.level || 0,
        wallet: `$${walletBal.toLocaleString()}`,
        bank: `$${bankBal.toLocaleString()}`,
        net: `$${netWorth.toLocaleString()}`,
        avatarUrl: avatarUrl
    };
    try {
        // Cast context to 'any' to avoid strict type conflicts
        const context = ctx;
        const selectedTheme = (theme || "cyberpunk").toLowerCase();
        switch (selectedTheme) {
            // --- STANDARD THEMES ---
            case "neon_noir":
            case "cyberpunk": // Keep as backward compat alias just in case
                await Styles.drawNeonNoir(context, width, height, data);
                break;
            case "frozen":
                await Styles.drawFrozen(context, width, height, data);
                break;
            case "egyptian":
                await Styles.drawEgyptian(context, width, height, data);
                break;
            case "sunset":
                await Styles.drawSunsetMiami(context, width, height, data);
                break;
            case "samurai":
                await Styles.drawSamurai(context, width, height, data);
                break;
            case "inferno":
                await Styles.drawInferno(context, width, height, data);
                break;
            case "joker":
                await Styles.drawJoker(context, width, height, data);
                break;
            case "cosmic":
                await Styles.drawCosmic(context, width, height, data);
                break;
            case "steampunk":
                await Styles.drawSteampunk(context, width, height, data);
                break;
            case "holo":
                await Styles.drawHolo(context, width, height, data);
                break;
            case "marble":
                await Styles.drawMarble(context, width, height, data);
                break;
            case "casino":
                await Styles.drawCasinoClassic(context, width, height, data);
                break;
            // --- PREMIUM THEMES ---
            case "obsidian":
                await Styles.drawObsidian(context, width, height, data);
                break;
            case "glass":
                await Styles.drawGlassmorphism(context, width, height, data);
                break;
            case "prism":
                await Styles.drawMidnightPrism(context, width, height, data);
                break;
            default:
                await Styles.drawNeonNoir(context, width, height, data);
                break;
        }
    }
    catch (error) {
        console.error("Error generating profile image:", error);
        return new discord_js_1.AttachmentBuilder(canvas.toBuffer(), { name: "profile-error.png" });
    }
    return new discord_js_1.AttachmentBuilder(canvas.toBuffer(), { name: "profile.png" });
}
async function generateRankCard(user, // { username, level, currentXp, requiredXp, rank, avatarUrl }
theme = "classic") {
    const width = 800;
    const height = 250;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext("2d");
    try {
        await Styles.drawRankCard(ctx, width, height, theme, user);
        return new discord_js_1.AttachmentBuilder(canvas.toBuffer(), { name: "rank.png" });
    }
    catch (error) {
        console.error("Error generating rank card:", error);
        return new discord_js_1.AttachmentBuilder(canvas.toBuffer(), { name: "rank-error.png" });
    }
}
//# sourceMappingURL=imageService.js.map