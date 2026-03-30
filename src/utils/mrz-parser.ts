import { PassengerData } from './message-parser';

// Country codes mapping for common nationalities
const COUNTRY_CODES: Record<string, string> = {
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

function cleanOCRText(text: string): string {
    // Basic replacements for common OCR errors
    let clean = text.toUpperCase();
    clean = clean.replace(/«/g, '<<');
    clean = clean.replace(/[\(\[\{]/g, '<');
    clean = clean.replace(/\s+/g, ''); // MRZ has no spaces
    return clean;
}

function parseDate(mrzDate: string): string {
    // mrzDate is YYMMDD
    if (mrzDate.length !== 6) return '';
    
    // Clean potential numbers OCR issues
    let cleanDate = mrzDate.toUpperCase().replace(/O/g, '0').replace(/Q/g, '0').replace(/I/g, '1').replace(/L/g, '1').replace(/S/g, '5').replace(/B/g, '8');

    const yearStr = cleanDate.substring(0, 2);
    const month = cleanDate.substring(2, 4);
    const day = cleanDate.substring(4, 6);
    
    let year = parseInt(yearStr);
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    
    // Logic: if YY > currentYear % 100 + 10, it's probably 19XX, else 20XX
    // Ex: if current is 2026, +10 is 36. So 40 -> 1940, 20 -> 2020.
    // However, for expiry dates, it can be up to +10 years from now.
    // Let's use a simpler heuristic based on age vs expiry.
    year += (year > (currentYear % 100) + 15) ? 1900 : 2000;
    
    return `${day}/${month}/${year}`;
}

export function parseMRZ(ocrText: string): PassengerData | null {
    // Split text into lines
    const lines = ocrText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
    
    // Find potential MRZ lines
    // MRZ for passport is 2 lines of 44 chars. But OCR might miss some.
    const cleanedLines = lines.map(cleanOCRText);

    let mrzLine1 = '';
    let mrzLine2 = '';

    // Regex to match the core MRZ Line 2 structure: Nat(3) + DOB(6) + Check(1) + Sex(1) + Exp(6)
    // We use a loose digit matcher because OCR often fails on specific letters or numbers, especially in low-res holograms
    const mrz2Regex = /[A-Z<]{2,3}[\dOISBQCZ]{5,6}[A-Z0-9<]{1,2}[A-Z<]{1,2}[\dOISBQCZ]{5,6}/i;

    const line2Index = cleanedLines.findIndex(l => mrz2Regex.test(l));

    if (line2Index >= 0) {
        mrzLine2 = cleanedLines[line2Index];
        if (line2Index > 0) {
            mrzLine1 = cleanedLines[line2Index - 1];
        }
    }

    if (!mrzLine1 || !mrzLine2) {
        // Fallback: Try to find a line that looks like MRZ Line 1 (starts with P, contains <<)
        const candidateLines = cleanedLines.filter(l => l.length > 30);
        const l1Index = candidateLines.findIndex(l => /^P.*<</i.test(l));
        
        if (l1Index >= 0 && l1Index + 1 < candidateLines.length) {
            mrzLine1 = candidateLines[l1Index];
            mrzLine2 = candidateLines[l1Index + 1];
        } else if (candidateLines.length >= 2) {
            // Just take the last two long lines as worst-case scenario
            mrzLine1 = candidateLines[candidateLines.length - 2];
            mrzLine2 = candidateLines[candidateLines.length - 1];
        }
    }

    if (!mrzLine1 || !mrzLine2) return null;

    // Clean Line 1 of common OCR mistakes for the '<' separator ONLY if they are very long sequences
    mrzLine1 = mrzLine1.replace(/[CLSK]{5,}/g, match => '<'.repeat(match.length));

    // We don't blindly pad yet, we extract as is
    try {
        // Line 1: P<ISSLASTNAME<<FIRSTNAME<<<<<<<<<<<<<
        let issuingCountry = 'N/A';
        let namesPart = mrzLine1.toUpperCase();

        // Strip prefix (e.g. P<USA, P<FRA, V<GBR)
        const prefixMatch = namesPart.match(/^[^PVA<]*([PVA])[<SKLCO0]?([A-Z<]{3})/i);
        if (prefixMatch) {
            issuingCountry = prefixMatch[2].replace(/</g, '');
            namesPart = namesPart.substring(prefixMatch[0].length);
        } else {
            // Strict fallback
            issuingCountry = namesPart.substring(2, 5).replace(/</g, '');
            namesPart = namesPart.substring(5);
        }

        // Tesseract often reads trailing <<<<<< as LLLLLL, SSSSSS, CCCCCC, KKKKKK.
        const paddingMatch = namesPart.match(/[SCLK]{4,}/);
        if (paddingMatch) {
            namesPart = namesPart.substring(0, paddingMatch.index);
        }

        // Find padding: < repeated 3 or more times. Chop everything from there to the end.
        const paddingAngleMatch = namesPart.match(/<{3,}/);
        if (paddingAngleMatch) {
            namesPart = namesPart.substring(0, paddingAngleMatch.index);
        }
        
        // Strip non-alpha trailing noise
        namesPart = namesPart.replace(/[^A-Z]+$/, '');

        let lastName = '';
        let firstName = '';

        if (namesPart.includes('<<')) {
            const nameSplit = namesPart.split('<<');
            lastName = nameSplit[0].replace(/</g, ' ').trim();
            firstName = nameSplit.slice(1).join(' ').replace(/</g, ' ').trim();
        } else if (namesPart.includes('<')) {
            const firstAngle = namesPart.indexOf('<');
            lastName = namesPart.substring(0, firstAngle).replace(/</g, ' ').trim();
            firstName = namesPart.substring(firstAngle + 1).replace(/</g, ' ').trim();
        } else {
            // Tesseract missed the double << entirely. Look for common broken separators
            const separatorMatch = namesPart.match(/SS|LL|CC|KK/);
            if (separatorMatch) {
                const sepIndex = separatorMatch.index!;
                lastName = namesPart.substring(0, sepIndex).replace(/</g, ' ').trim();
                firstName = namesPart.substring(sepIndex + 2).replace(/</g, ' ').trim();
            } else {
                lastName = namesPart;
            }
        }
        
        // Strip OCR padding characters that got attached to the end of the name
        firstName = firstName.replace(/[SCLK]+$/, '').trim();
        lastName = lastName.replace(/[SCLK]+$/, '').trim();
        
        // Capitalize nicely
        const formatName = (n: string) => n.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
        
        lastName = formatName(lastName);
        firstName = formatName(firstName);

        // Robust Line 2 matching: (Nat 3) (DOB 6) (Check 1) (Sex 1) (Expiry 6)
        // With extreme OCR tolerance (e.g. sex character F read as P or B, digits read as C or Z)
        const coreMatchMatch = mrzLine2.match(/([A-Z<]{3})([\dOISBQCZ]{6})[A-Z0-9<]([A-Z<])([\dOISBQCZ]{6})/i);
        let nationalityCode = 'N/A';
        let dobRaw = '';
        let sexRaw = '';
        let expiryRaw = '';
        let passportNumber = '';

        if (coreMatchMatch) {
            nationalityCode = coreMatchMatch[1].replace(/</g, '');
            dobRaw = coreMatchMatch[2];
            sexRaw = coreMatchMatch[3];
            expiryRaw = coreMatchMatch[4];
            
            const matchIndex = mrzLine2.indexOf(coreMatchMatch[0]);
            if (matchIndex > 0) {
                // Everything before the core match (minus 1 for the passport check digit) is the passport number
                passportNumber = mrzLine2.substring(0, matchIndex - 1).replace(/</g, '').replace(/O/g, '0');
            }
        } else {
            // Strict fallback
            mrzLine2 = (mrzLine2 + '<'.repeat(44)).substring(0, 44);
            passportNumber = mrzLine2.substring(0, 9).replace(/</g, '').replace(/O/g, '0');
            nationalityCode = mrzLine2.substring(10, 13).replace(/</g, '');
            dobRaw = mrzLine2.substring(13, 19);
            sexRaw = mrzLine2.substring(20, 21);
            expiryRaw = mrzLine2.substring(21, 27);
        }

        let gender = 'Masculino';
        if (sexRaw === 'F') gender = 'Feminino';
        else if (sexRaw === 'M') gender = 'Masculino';
        
        const birthDate = parseDate(dobRaw);
        
        // User requested: Passport expiry date should ALWAYS be a random date between 01/01/2028 and 31/12/2035
        const randomExpiryStr = () => {
            const minDate = new Date(2028, 0, 1).getTime();
            const maxDate = new Date(2035, 11, 31).getTime();
            const randomTime = minDate + Math.random() * (maxDate - minDate);
            const d = new Date(randomTime);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };
        const expiryDate = randomExpiryStr();

        // Hardcode exactly as requested by the user, regardless of what the OCR read
        const nationality = 'Estados Unidos';
        const issuanceCountry = 'Estados Unidos';

        return {
            firstName: firstName || 'Desconhecido',
            lastName: lastName || 'Desconhecido',
            gender,
            birthDate: birthDate || '01/01/1900',
            passportNumber: passportNumber || 'Desconhecido',
            nationality: nationality || 'Desconhecido',
            passportExpiry: expiryDate || '01/01/2030',
            passportIssuanceCountry: issuanceCountry || 'Desconhecido'
        };
    } catch (e) {
        console.error("Erro ao analisar MRZ", e);
        return null;
    }
}
