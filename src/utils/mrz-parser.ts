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
    let cleanDate = mrzDate.replace(/O/g, '0').replace(/I/g, '1').replace(/L/g, '1').replace(/S/g, '5').replace(/B/g, '8');

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
    let mrzLine1 = '';
    let mrzLine2 = '';

    for (let i = 0; i < lines.length; i++) {
        let line = cleanOCRText(lines[i]);
        if (line.startsWith('P<') || line.startsWith('P') && line.includes('<<')) {
            mrzLine1 = line;
            if (i + 1 < lines.length) {
                mrzLine2 = cleanOCRText(lines[i + 1]);
            }
            break;
        }
    }

    if (!mrzLine1 || !mrzLine2) {
        // Try fallback: find any line with a lot of '<'
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].split('<').length > 5) {
                if (!mrzLine1) mrzLine1 = cleanOCRText(lines[i]);
                else if (!mrzLine2) {
                    mrzLine2 = cleanOCRText(lines[i]);
                    break;
                }
            }
        }
    }

    if (!mrzLine1 || !mrzLine2) return null;

    // Pad or trim to 44 chars just in case (OCR might miss trailing <)
    mrzLine1 = (mrzLine1 + '<'.repeat(44)).substring(0, 44);
    mrzLine2 = (mrzLine2 + '<'.repeat(44)).substring(0, 44);

    try {
        // Line 1: P<ISSLASTNAME<<FIRSTNAME<<<<<<<<<<<<<
        const issuingCountry = mrzLine1.substring(2, 5).replace(/</g, '');
        const namesPart = mrzLine1.substring(5);
        const nameSplit = namesPart.split('<<');
        
        let lastName = nameSplit[0] ? nameSplit[0].replace(/</g, ' ').trim() : '';
        let firstName = nameSplit[1] ? nameSplit[1].replace(/</g, ' ').trim() : '';
        
        // Capitalize nicely
        const formatName = (n: string) => n.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
        
        lastName = formatName(lastName);
        firstName = formatName(firstName);

        // Line 2: passport(9) check(1) nat(3) dob(6) check(1) sex(1) expiry(6) check(1) personal(14) check(1) check(1)
        const passportNumber = mrzLine2.substring(0, 9).replace(/</g, '').replace(/O/g, '0');
        const nationalityCode = mrzLine2.substring(10, 13).replace(/</g, '');
        const dobRaw = mrzLine2.substring(13, 19);
        const sexRaw = mrzLine2.substring(20, 21);
        const expiryRaw = mrzLine2.substring(21, 27);

        let gender = 'Masculino';
        if (sexRaw === 'F') gender = 'Feminino';
        else if (sexRaw === 'M') gender = 'Masculino';
        
        const birthDate = parseDate(dobRaw);
        
        // Expiry dates are usually in the future, so if the year is small, it's 20XX
        let expiryDate = parseDate(expiryRaw);
        if (expiryDate) {
            const parts = expiryDate.split('/');
            let year = parseInt(parts[2]);
            // If expiry year is < 2000, it was probably parsed wrong due to the +15 heuristic, 
            // since passport expiry is up to 10 years in the future.
            const currentYear = new Date().getFullYear();
            if (year < currentYear - 10) year += 100; // adjust back to 20XX if needed
            expiryDate = `${parts[0]}/${parts[1]}/${year}`;
        }

        const nationality = COUNTRY_CODES[nationalityCode] || nationalityCode;
        const issuanceCountry = COUNTRY_CODES[issuingCountry] || issuingCountry;

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
