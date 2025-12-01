"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initEmojiRegistry = initEmojiRegistry;
exports.setPersistedEmoji = setPersistedEmoji;
exports.getEmojiRecord = getEmojiRecord;
exports.emojiCdnUrl = emojiCdnUrl;
exports.emojiIconUrl = emojiIconUrl;
exports.emojiInline = emojiInline;
exports.preferEmojiInlineOrUrl = preferEmojiInlineOrUrl;
exports.listEmojiKeys = listEmojiKeys;
// src/utils/emojiRegistry.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Optional manual mapping file. We load it dynamically so the module is optional.
 * If you have `src/config/emojis.ts` exporting `APP_EMOJIS`, it will be used.
 *
 * Example of src/config/emojis.ts:
 * export const APP_EMOJIS = {
 *   coin: { id: "1443857913637507144", name: "coin", animated: false }
 * }
 */
let APP_EMOJIS = {};
try {
    // dynamic require to avoid hard failure if file doesn't exist
    // note: relative to compiled JS this path may vary; this runs in ts-node/dev so this should work
    // Prefer `src/config/emojis.ts` (plural) as the canonical filename.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../config/emojis");
    if (mod && typeof mod.APP_EMOJIS === "object")
        APP_EMOJIS = mod.APP_EMOJIS;
}
catch {
    // no manual config present — that's fine
}
const registry = new Map();
const DATA_PATH = path_1.default.join(__dirname, "..", "data", "emojis.json");
/** Read persisted JSON file (safe) */
function readPersisted() {
    try {
        if (!fs_1.default.existsSync(DATA_PATH))
            return {};
        const raw = fs_1.default.readFileSync(DATA_PATH, "utf8");
        return JSON.parse(raw || "{}");
    }
    catch (e) {
        console.warn("emojiRegistry: Failed to read persisted emojis:", e);
        return {};
    }
}
/** Persist mapping to JSON */
function writePersisted(obj) {
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(DATA_PATH), { recursive: true });
        fs_1.default.writeFileSync(DATA_PATH, JSON.stringify(obj, null, 2), "utf8");
    }
    catch (e) {
        console.error("emojiRegistry: Failed to write persisted emojis:", e);
    }
}
/**
 * Initialize registry:
 * - load APP_EMOJIS (optional manual)
 * - load persisted JSON
 * - discover from client cache
 * - optionally fetch all emojis from EMOJI_GUILD_ID if env set
 *
 * Call once after client 'ready'.
 */
async function initEmojiRegistry(client) {
    // 1) manual config
    try {
        if (APP_EMOJIS && typeof APP_EMOJIS === "object") {
            for (const [key, v] of Object.entries(APP_EMOJIS)) {
                if (!v || !v.id)
                    continue;
                registry.set(key, { id: v.id, name: v.name ?? key, animated: !!v.animated });
            }
        }
    }
    catch (e) {
        // continue even if manual config parsing fails
        console.warn("emojiRegistry: failed loading APP_EMOJIS", e);
    }
    // 2) persisted JSON
    try {
        const persisted = readPersisted();
        for (const [key, rec] of Object.entries(persisted)) {
            if (rec && rec.id)
                registry.set(key, { id: rec.id, name: rec.name ?? key, animated: !!rec.animated });
        }
    }
    catch (e) {
        console.warn("emojiRegistry: failed loading persisted emojis", e);
    }
    // 3) discover currently cached emojis (app + guilds)
    try {
        client.emojis.cache.forEach((e) => {
            if (!registry.has(e.name))
                registry.set(e.name, { id: e.id, name: e.name, animated: e.animated });
        });
    }
    catch (e) {
        console.warn("emojiRegistry: error discovering client emoji cache", e);
    }
    // 4) optionally: fetch emojis from storage guild (if provided)
    const storGuildId = process.env.EMOJI_GUILD_ID;
    if (storGuildId) {
        try {
            const guild = client.guilds.cache.get(storGuildId) ?? (await client.guilds.fetch(storGuildId).catch(() => null));
            if (guild) {
                // ensure guild emojis cached
                await guild.emojis.fetch().catch(() => null);
                guild.emojis.cache.forEach((e) => {
                    if (!registry.has(e.name))
                        registry.set(e.name, { id: e.id, name: e.name, animated: e.animated });
                });
            }
            else {
                console.warn("emojiRegistry: storage guild not available or bot not in the guild:", storGuildId);
            }
        }
        catch (e) {
            console.warn("emojiRegistry: failed to fetch emojis from storage guild:", e);
        }
    }
}
/** Persist a mapping (also writes to JSON) */
function setPersistedEmoji(key, rec) {
    try {
        const obj = readPersisted();
        obj[key] = rec;
        writePersisted(obj);
        // update in-memory registry immediately
        registry.set(key, rec);
    }
    catch (e) {
        console.error("emojiRegistry: failed to persist emoji mapping:", e);
    }
}
/** Basic getters */
function getEmojiRecord(key) {
    return registry.get(key);
}
function emojiCdnUrl(id, animated = false) {
    if (!id)
        return undefined;
    const ext = animated ? "gif" : "png";
    return `https://cdn.discordapp.com/emojis/${id}.${ext}?size=256&quality=lossless`;
}
function emojiIconUrl(key) {
    const r = getEmojiRecord(key);
    if (!r)
        return undefined;
    return emojiCdnUrl(r.id, !!r.animated);
}
/** Inline only allowed if emoji exists in the target guild */
function emojiInline(key, guild) {
    const r = getEmojiRecord(key);
    if (!r || !guild)
        return undefined;
    const found = guild.emojis.cache.get(r.id);
    if (!found)
        return undefined;
    return found.animated ? `<a:${found.name}:${found.id}>` : `<:${found.name}:${found.id}>`;
}
/** prefer inline else url */
function preferEmojiInlineOrUrl(key, guild) {
    const inline = emojiInline(key, guild);
    if (inline)
        return { type: "inline", value: inline };
    const url = emojiIconUrl(key);
    if (url)
        return { type: "url", value: url };
    return null;
}
function listEmojiKeys() {
    return Array.from(registry.keys());
}
//# sourceMappingURL=emojiRegistry.js.map