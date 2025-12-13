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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let APP_EMOJIS = {};
try {
    const mod = require("../config/emojis");
    if (mod && typeof mod.APP_EMOJIS === "object")
        APP_EMOJIS = mod.APP_EMOJIS;
}
catch {
}
const registry = new Map();
const DATA_PATH = path_1.default.join(__dirname, "..", "data", "emojis.json");
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
function writePersisted(obj) {
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(DATA_PATH), { recursive: true });
        fs_1.default.writeFileSync(DATA_PATH, JSON.stringify(obj, null, 2), "utf8");
    }
    catch (e) {
        console.error("emojiRegistry: Failed to write persisted emojis:", e);
    }
}
async function initEmojiRegistry(client) {
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
        console.warn("emojiRegistry: failed loading APP_EMOJIS", e);
    }
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
    try {
        client.emojis.cache.forEach((e) => {
            if (!registry.has(e.name))
                registry.set(e.name, { id: e.id, name: e.name, animated: e.animated });
        });
    }
    catch (e) {
        console.warn("emojiRegistry: error discovering client emoji cache", e);
    }
    const storGuildId = process.env.EMOJI_GUILD_ID;
    if (storGuildId) {
        try {
            const guild = client.guilds.cache.get(storGuildId) ?? (await client.guilds.fetch(storGuildId).catch(() => null));
            if (guild) {
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
function setPersistedEmoji(key, rec) {
    try {
        const obj = readPersisted();
        obj[key] = rec;
        writePersisted(obj);
        registry.set(key, rec);
    }
    catch (e) {
        console.error("emojiRegistry: failed to persist emoji mapping:", e);
    }
}
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
function emojiInline(key, guild) {
    const r = getEmojiRecord(key);
    if (!r || !guild)
        return undefined;
    const found = guild.emojis.cache.get(r.id);
    if (!found)
        return undefined;
    return found.animated ? `<a:${found.name}:${found.id}>` : `<:${found.name}:${found.id}>`;
}
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