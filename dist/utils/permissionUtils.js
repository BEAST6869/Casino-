"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_OWNER_ID = void 0;
exports.canExecuteAdminCommand = canExecuteAdminCommand;
exports.canExecuteRestrictedAdminCommand = canExecuteRestrictedAdminCommand;
exports.BOT_OWNER_ID = "1288340046449086567";
async function canExecuteAdminCommand(message, member) {
    if (!member)
        member = message.member;
    if (!member)
        return false;
    if (message.author.id === exports.BOT_OWNER_ID)
        return true;
    if (message.author.id === message.guild?.ownerId)
        return true;
    if (member.permissions.has("Administrator"))
        return true;
    return false;
}
function canExecuteRestrictedAdminCommand(message, member) {
    if (!member)
        member = message.member;
    if (!member)
        return false;
    if (message.author.id === exports.BOT_OWNER_ID)
        return true;
    if (message.author.id === message.guild?.ownerId)
        return true;
    if (member.permissions.has("Administrator"))
        return true;
    return false;
}
//# sourceMappingURL=permissionUtils.js.map