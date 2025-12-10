"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.levenshteinDistance = levenshteinDistance;
exports.findBestMatch = findBestMatch;
/**
 * Calculate the Levenshtein distance between two strings.
 */
function levenshteinDistance(a, b) {
    const matrix = [];
    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                Math.min(matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                ));
            }
        }
    }
    return matrix[b.length][a.length];
}
/**
 * Find the best match for a given input string from a list of candidates.
 * Returns null if no good match is found (threshold logic included).
 */
function findBestMatch(input, candidates) {
    if (!input || candidates.length === 0)
        return null;
    let bestMatch = null;
    let bestDistance = Infinity;
    for (const candidate of candidates) {
        const distance = levenshteinDistance(input, candidate);
        // Threshold logic:
        // For short words (<= 3 chars), allow max 1 edit
        // For medium words (4-6 chars), allow max 2 edits
        // For long words (> 6 chars), allow max 3 edits
        let threshold = 3;
        if (candidate.length <= 3)
            threshold = 1;
        else if (candidate.length <= 6)
            threshold = 2;
        if (distance < bestDistance && distance <= threshold) {
            bestDistance = distance;
            bestMatch = candidate;
        }
    }
    return bestMatch;
}
//# sourceMappingURL=stringUtils.js.map