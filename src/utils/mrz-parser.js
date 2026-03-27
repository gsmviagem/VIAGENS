"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMRZ = parseMRZ;
// Country codes mapping for common nationalities
var COUNTRY_CODES = {
    'USA': 'Estados Unidos',
    'BRA': 'Brasil',
    'ARG': 'Argentina',
    'GBR': 'Reino Unido',
    'FRA': 'França',
    'ITA': 'Itália',
    'DEU': 'Alemanha',
    'ESP': 'Espanha',
    'CAN': 'Canadá',
    'PRT': 'Portugal',
    'MEX': 'México',
    'CHL': 'Chile',
    'URY': 'Uruguai',
    'COL': 'Colômbia',
    'JPN': 'Japão',
    'CHN': 'China',
    'ISR': 'Israel'
};
function cleanOCRText(text) {
    // Basic replacements for common OCR errors
    var clean = text.toUpperCase();
    clean = clean.replace(/«/g, '<<');
    clean = clean.replace(/[\(\[\{]/g, '<');
    clean = clean.replace(/\s+/g, ''); // MRZ has no spaces
    return clean;
}
function parseDate(mrzDate) {
    // mrzDate is YYMMDD
    if (mrzDate.length !== 6)
        return '';
    // Clean potential numbers OCR issues
    var cleanDate = mrzDate.toUpperCase().replace(/O/g, '0').replace(/Q/g, '0').replace(/I/g, '1').replace(/L/g, '1').replace(/S/g, '5').replace(/B/g, '8');
    var yearStr = cleanDate.substring(0, 2);
    var month = cleanDate.substring(2, 4);
    var day = cleanDate.substring(4, 6);
    var year = parseInt(yearStr);
    var currentYear = new Date().getFullYear();
    var currentCentury = Math.floor(currentYear / 100) * 100;
    // Logic: if YY > currentYear % 100 + 10, it's probably 19XX, else 20XX
    // Ex: if current is 2026, +10 is 36. So 40 -> 1940, 20 -> 2020.
    // However, for expiry dates, it can be up to +10 years from now.
    // Let's use a simpler heuristic based on age vs expiry.
    year += (year > (currentYear % 100) + 15) ? 1900 : 2000;
    return "".concat(day, "/").concat(month, "/").concat(year);
}
function parseMRZ(ocrText) {
    // Split text into lines
    var lines = ocrText.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 20; });
    // Find potential MRZ lines
    // MRZ for passport is 2 lines of 44 chars. But OCR might miss some.
    var cleanedLines = lines.map(cleanOCRText);
    var mrzLine1 = '';
    var mrzLine2 = '';
    // Regex to match the core MRZ Line 2 structure: Nat(3) + DOB(6) + Check(1) + Sex(1) + Exp(6)
    // We use a loose digit matcher [\dOISB] because O/0, I/1, S/5, B/8 are common OCR errors
    var mrz2Regex = /[A-Z<]{3}[\dOISBQ]{6}[\dOISBQ][MF<X][\dOISBQ]{6}/;
    // Try finding by strict properties first
    mrzLine1 = cleanedLines.find(function (l) { return (l.startsWith('P') || l.startsWith('V') || l.startsWith('A')) && l.includes('<<'); }) || '';
    mrzLine2 = cleanedLines.find(function (l) { return mrz2Regex.test(l); }) || '';
    if (!mrzLine1 || !mrzLine2) {
        // Fallback sequentially (ensure we don't assign the same line to both)
        for (var i = 0; i < cleanedLines.length; i++) {
            var line = cleanedLines[i];
            if (!mrzLine1 && (line.startsWith('P') || line.startsWith('V') || line.startsWith('A')) && line.includes('<<')) {
                mrzLine1 = line;
            }
            else if (mrzLine1 && !mrzLine2 && line !== mrzLine1 && line.split('<').length > 3) {
                // The line right after mrzLine1, or any subsequent line that looks MRZ-ish
                mrzLine2 = line;
                break;
            }
        }
    }
    if (!mrzLine1 || !mrzLine2) {
        // Ultimate fallback
        var mrzLikeLines = cleanedLines.filter(function (l) { return l.split('<').length > 4; });
        if (mrzLikeLines.length >= 2) {
            mrzLine1 = mrzLikeLines[0];
            mrzLine2 = mrzLikeLines[1];
        }
        else if (mrzLikeLines.length === 1 && !mrzLine1) {
            mrzLine1 = mrzLikeLines[0];
        }
    }
    if (!mrzLine1 || !mrzLine2)
        return null;
    // Pad or trim to 44 chars just in case (OCR might miss trailing <)
    mrzLine1 = (mrzLine1 + '<'.repeat(44)).substring(0, 44);
    // Don't truncate mrzLine2 just yet, we'll use regex.
    try {
        // Line 1: P<ISSLASTNAME<<FIRSTNAME<<<<<<<<<<<<<
        var issuingCountry = mrzLine1.substring(2, 5).replace(/</g, '');
        var namesPart = mrzLine1.substring(5);
        var nameSplit = namesPart.split('<<');
        var lastName = nameSplit[0] ? nameSplit[0].replace(/</g, ' ').trim() : '';
        var firstName = nameSplit[1] ? nameSplit[1].replace(/</g, ' ').trim() : '';
        // Capitalize nicely
        var formatName = function (n) { return n.split(' ').map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(); }).join(' '); };
        lastName = formatName(lastName);
        firstName = formatName(firstName);
        // Robust Line 2 matching: (Nat 3) (DOB 6) (Check 1) (Sex 1) (Expiry 6)
        // Note: we use loose digit matchers because Tesseract often misreads 0 as O, 8 as B, etc.
        var coreMatchMatch = mrzLine2.match(/([A-Z<]{3})([\dOISBQ]{6})[\dOISBQ]([MF<X])([\dOISBQ]{6})/);
        var nationalityCode = 'N/A';
        var dobRaw = '';
        var sexRaw = '';
        var expiryRaw = '';
        var passportNumber = '';
        if (coreMatchMatch) {
            nationalityCode = coreMatchMatch[1].replace(/</g, '');
            dobRaw = coreMatchMatch[2];
            sexRaw = coreMatchMatch[3];
            expiryRaw = coreMatchMatch[4];
            var matchIndex = mrzLine2.indexOf(coreMatchMatch[0]);
            if (matchIndex > 0) {
                // Everything before the core match (minus 1 for the passport check digit) is the passport number
                passportNumber = mrzLine2.substring(0, matchIndex - 1).replace(/</g, '').replace(/O/g, '0');
            }
        }
        else {
            // Strict fallback
            mrzLine2 = (mrzLine2 + '<'.repeat(44)).substring(0, 44);
            passportNumber = mrzLine2.substring(0, 9).replace(/</g, '').replace(/O/g, '0');
            nationalityCode = mrzLine2.substring(10, 13).replace(/</g, '');
            dobRaw = mrzLine2.substring(13, 19);
            sexRaw = mrzLine2.substring(20, 21);
            expiryRaw = mrzLine2.substring(21, 27);
        }
        var gender = 'Masculino';
        if (sexRaw === 'F')
            gender = 'Feminino';
        else if (sexRaw === 'M')
            gender = 'Masculino';
        var birthDate = parseDate(dobRaw);
        // Expiry dates are usually in the future, so if the year is small, it's 20XX
        var expiryDate = parseDate(expiryRaw);
        if (expiryDate) {
            var parts = expiryDate.split('/');
            var year = parseInt(parts[2]);
            // If expiry year is < 2000, it was probably parsed wrong due to the +15 heuristic, 
            // since passport expiry is up to 10 years in the future.
            var currentYear = new Date().getFullYear();
            if (year < currentYear - 10)
                year += 100; // adjust back to 20XX if needed
            expiryDate = "".concat(parts[0], "/").concat(parts[1], "/").concat(year);
        }
        var nationality = COUNTRY_CODES[nationalityCode] || nationalityCode;
        var issuanceCountry = COUNTRY_CODES[issuingCountry] || issuingCountry;
        return {
            firstName: firstName || 'Desconhecido',
            lastName: lastName || 'Desconhecido',
            gender: gender,
            birthDate: birthDate || '01/01/1900',
            passportNumber: passportNumber || 'Desconhecido',
            nationality: nationality || 'Desconhecido',
            passportExpiry: expiryDate || '01/01/2030',
            passportIssuanceCountry: issuanceCountry || 'Desconhecido'
        };
    }
    catch (e) {
        console.error("Erro ao analisar MRZ", e);
        return null;
    }
}
