import { createCanvas } from "canvas";
import { AttachmentBuilder } from "discord.js";
import * as Styles from "./profileStyles";

// Use 'any' for context to be safe across different canvas versions/types
type Context = any;

export async function generateProfileImage(
    user: any,
    walletBal: number,
    bankBal: number,
    netWorth: number,
    avatarUrl: string,
    theme: string = "cyberpunk"
) {
    const width = 800;
    const height = 450;
    const canvas = createCanvas(width, height);
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
        const context = ctx as unknown as Context;

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
    } catch (error) {
        console.error("Error generating profile image:", error);
        return new AttachmentBuilder(canvas.toBuffer(), { name: "profile-error.png" });
    }

    return new AttachmentBuilder(canvas.toBuffer(), { name: "profile.png" });
}

export async function generateRankCard(
    user: any, // { username, level, currentXp, requiredXp, rank, avatarUrl }
    theme: string = "classic"
) {
    const width = 800;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    try {
        await Styles.drawRankCard(ctx, width, height, theme, user);
        return new AttachmentBuilder(canvas.toBuffer(), { name: "rank.png" });
    } catch (error) {
        console.error("Error generating rank card:", error);
        return new AttachmentBuilder(canvas.toBuffer(), { name: "rank-error.png" });
    }
}