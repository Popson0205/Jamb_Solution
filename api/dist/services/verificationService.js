"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCandidate = verifyCandidate;
const db_1 = require("../db");
async function verifyCandidate(reg_number, full_name) {
    if (!reg_number || !full_name) {
        return { verified: false, reason: 'Registration number and full name are required.' };
    }
    const candidate = await (0, db_1.db)('candidates')
        .whereRaw('reg_number = ?', [reg_number.trim().toUpperCase()])
        .first();
    if (!candidate) {
        return {
            verified: false,
            reason: `Registration number ${reg_number} was not found in the JAMB candidates list.`,
        };
    }
    // Exact match — case-insensitive, trim whitespace
    const submittedName = full_name.trim().toUpperCase().replace(/\s+/g, ' ');
    const registeredName = candidate.full_name.trim().toUpperCase().replace(/\s+/g, ' ');
    if (submittedName !== registeredName) {
        return {
            verified: false,
            reason: `Name does not match our records for registration number ${reg_number}. Please check your name as registered with JAMB.`,
        };
    }
    if (!candidate.is_verified) {
        return {
            verified: false,
            reason: `Registration number ${reg_number} has not been verified by JAMB. Please contact your nearest JAMB office.`,
        };
    }
    return { verified: true, candidate };
}
