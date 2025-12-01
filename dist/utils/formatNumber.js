"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNumberIntl = formatNumberIntl;
function formatNumberIntl(n, opts) {
    const locale = opts?.locale ?? "en-US";
    const maximumFractionDigits = opts?.maximumFractionDigits ?? 0;
    return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(n);
}
//# sourceMappingURL=formatNumber.js.map