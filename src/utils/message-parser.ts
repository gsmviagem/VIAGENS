export interface PassengerData {
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string;
    passportNumber: string;
    nationality: string;
    passportExpiry: string;
    passportIssuanceCountry: string;
    previousAccount?: string[];
}

export interface ProcessedData {
    origin: string;
    destination: string;
    date: string;
    returnDate: string;
    returnDestination: string;
    returnFlightTime: string;
    classType: string;
    partner: string;
    adults: number;
    children: number;
    infants: number;
    flightTime: string;
    passengers: PassengerData[];
    hasFlightData?: boolean;
}

import { GENDER_DICT } from './gender-dict';

const MONTHS_MAP: { [key: string]: string } = {
    jan: '01', january: '01', janeiro: '01',
    feb: '02', february: '02', fevereiro: '02',
    mar: '03', march: '03', marco: '03', março: '03',
    apr: '04', april: '04', abril: '04',
    may: '05', maio: '05',
    jun: '06', june: '06', junho: '06',
    jul: '07', july: '07', julho: '07',
    aug: '08', august: '08', agosto: '08',
    sep: '09', september: '09', setembro: '09',
    oct: '10', october: '10', outubro: '10',
    nov: '11', november: '11', novembro: '11',
    dec: '12', december: '12', dezembro: '12'
};

export function parseFlightMessage(message: string, isAmericanFormat: boolean = false): ProcessedData {
    // 0. Initial Sanitization
    let msg = message.toLowerCase().replace(/\t/g, ' '); // Replace tabs with spaces
    msg = msg.replace(/\b(?:pls|please)\b/g, ' '); // Remove noise words
    // Remove 'for' as a standalone connector word (e.g. "...flight for Leah..." → "...flight  Leah...")
    msg = msg.replace(/\bfor\b/g, ' ');
    
    const data: ProcessedData = {
        origin: '',
        destination: '',
        date: '',
        returnDate: '',
        returnDestination: '',
        returnFlightTime: '',
        classType: '',
        partner: '',
        adults: 0,
        children: 0,
        infants: 0,
        flightTime: '',
        passengers: []
    };

    let workingMsg = msg;

    // --- 1. PASSENGER EXTRACTION (CONSUMER MODE) ---
    // This regex looks for: Name Title (optional) + Name + Date (Slashed or Textual)
    // Supports: "Joel Rubinstein 02/02/1982", "Pessy Rubinstein Nov. 28, 1981", "Hershy Rubinstein Feb. 16, 2021"
    const monthNames = Object.keys(MONTHS_MAP).join('|');
    
    // Regex components
    // Allow middle initials (1 char) like "Chaim B Ungar" or "Mary J Smith"
    const namePart = /([a-zÀ-ÿ]{2,}(?:\s+[a-zÀ-ÿ]+)+)/.source;
    const datePart = new RegExp(
        `(?:` +
        `(\\d{1,2})[/\\-.](\\d{1,2})[/\\-.](\\d{2,4})` + // 02/02/1982 or 02.02.1982
        `|` +
        `(\\d{1,2})\\s+(\\d{1,2})\\s+(\\d{2,4})` +       // 10 31 04 (space-separated)
        `|` +
        `(${monthNames})[a-z.]*\\s*(?:(\\d{1,2})[\\s,]+)?(?:(\\d{1,2})[\\s,]+)?(\\d{4})` + // Nov. 28, 1981 or Jan 21 2007
        `|` +
        `(\\d{1,2})\\s+(${monthNames})[a-z.]*\\s+(\\d{2,4})` + // 16 Feb 2021
        `)`, 'i'
    ).source;

    const passengerRegex = new RegExp(`${namePart}\\s+${datePart}`, 'gi');
    
    let match;
    const passengersToRemove: string[] = [];

    while ((match = passengerRegex.exec(msg)) !== null) {
        const fullMatch = match[0];
        const nameText = match[1].trim();
        const names = nameText.split(/\s+/);
        
        let birthDay = '';
        let birthMonth = '';
        let birthYear = '';

        if (match[2]) { // Slashed or dotted: DD/MM/YYYY, DD.MM.YYYY
            if (isAmericanFormat) {
                birthMonth = match[2];
                birthDay = match[3];
            } else {
                birthDay = match[2];
                birthMonth = match[3];
            }
            birthYear = match[4];
        } else if (match[5]) { // Space-separated numeric: 10 31 04
            if (isAmericanFormat) {
                birthMonth = match[5];
                birthDay = match[6];
            } else {
                birthDay = match[5];
                birthMonth = match[6];
            }
            birthYear = match[7];
        } else if (match[8]) { // Month-first: Nov. 28, 1981
            birthMonth = MONTHS_MAP[match[8].toLowerCase()];
            birthDay = match[9] || match[10] || '01';
            birthYear = match[11];
        } else if (match[12]) { // Day-first textual: 16 Feb 2021
            birthDay = match[12];
            birthMonth = MONTHS_MAP[match[13].toLowerCase()];
            birthYear = match[14];
        }

        // Strip any leading stop-word tokens captured by the greedy namePart regex
        // e.g. "pm leah friedman" → strip "pm" → ["leah", "friedman"]
        const nameStopWords = new Set(['am', 'pm', 'vs', 'and', 'or', 'to', 'via', 'the', 'dep', 'arr']);
        while (names.length > 0 && nameStopWords.has(names[0].toLowerCase())) {
            names.shift();
        }
        // After trimming leading stop-words, reject if a stop-word still sits in the middle
        if (names.some(n => nameStopWords.has(n.toLowerCase()))) continue;

        if (names.length >= 2 && birthYear) {
            // firstName = everything except the last token; lastName = last token only
            const fName = names.slice(0, -1).join(' ');
            const lName = names[names.length - 1];

            // Last name must be a real word (not a single initial)
            if (lName.length < 2) continue;
            
            // Validate if it looks like a birth year (typically < current year - 1)
            const yearNum = parseInt(birthYear.length === 2 ? (parseInt(birthYear) > 25 ? `19${birthYear}` : `20${birthYear}`) : birthYear);
            const currentYear = new Date().getFullYear();
            
            if (yearNum < currentYear) {
                addPassenger(data, fName, lName, birthDay, birthMonth, yearNum.toString());
                passengersToRemove.push(fullMatch);
            }

        }

    }

    // Explicit counts (if any)
    const getCount = (regex: RegExp) => {
        let count = 0;
        let m;
        while ((m = regex.exec(msg)) !== null) {
            count += parseInt(m[1] || m[2]);
        }
        return count;
    };

    const explicitAdults = getCount(/(?:(\d+)\s*(?:adulto|adultos|pax|adult\b|adults\b))|(?:(?:adulto|adultos|pax|adult\b|adults\b)\s*[:\-]?\s*(\d+))/gi);
    const explicitChildren = getCount(/(?:(\d+)\s*(?:crian[cç]as?|children|child|chld|chd\b))|(?:(?:crian[cç]as?|children|child|chld|chd\b)\s*[:\-]?\s*(\d+))/gi);
    const explicitInfants = getCount(/(?:(\d+)\s*(?:beb[eê]s?|infant|inf\b|baby|babies))|(?:(?:beb[eê]s?|infant|inf\b|baby|babies)\s*[:\-]?\s*(\d+))/gi);

    // Remove passengers from the "Flight Info Pool"
    let flightInfoPool = msg;
    for (const pStr of passengersToRemove) {
        flightInfoPool = flightInfoPool.replace(pStr, ' ');
    }

    // --- 2. ROUTE EXTRACTION (supports round-trips) ---
    // e.g. "lhr-jfk vs 6:35pm, and apr13 jfk-lhr 11:40pm"
    const routeRegex = /\b([a-z]{3})\s*(?:-|to|\/|\s+)\s*([a-z]{3})\b/g;
    const excludedWords = new Set(['eco', 'pax', 'via', 'the', 'and', 'dep', 'arr', 'pls', 'now', 'day']);
    
    let routeMatch;
    const foundRoutes: { code1: string; code2: string; raw: string }[] = [];
    while ((routeMatch = routeRegex.exec(flightInfoPool)) !== null) {
        const code1 = routeMatch[1].toLowerCase();
        const code2 = routeMatch[2].toLowerCase();
        if (!excludedWords.has(code1) && !excludedWords.has(code2)) {
            foundRoutes.push({ code1, code2, raw: routeMatch[0] });
        }
    }

    if (foundRoutes.length >= 1) {
        data.origin = foundRoutes[0].code1.toUpperCase();
        data.destination = foundRoutes[0].code2.toUpperCase();
        flightInfoPool = flightInfoPool.replace(foundRoutes[0].raw, ' ');
    }
    if (foundRoutes.length >= 2) {
        // Return leg — returnDestination is the 2nd route's destination
        data.returnDestination = foundRoutes[1].code2.toUpperCase();
        flightInfoPool = flightInfoPool.replace(foundRoutes[1].raw, ' ');
    }

    // --- 3. FLIGHT DATE EXTRACTION (outbound + return) ---
    // Helper: extract first date from a string, returns [normalizedDate, rawMatch] or null
    const extractDate = (pool: string): [string, string] | null => {
        const slashMatch = pool.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
        const textualMatch = pool.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})[a-z.]*(?:[\\s,]*(\\d{4}))?`, 'i'));
        const monthFirst = pool.match(new RegExp(`(${monthNames})[a-z.]*\\s*(\\d{1,2})(?:[\\s,]*(\\d{4}))?`, 'i'));

        if (slashMatch) return [normalizeDate(slashMatch[1], slashMatch[2], slashMatch[3]), slashMatch[0]];
        if (textualMatch) return [normalizeDate(textualMatch[1], MONTHS_MAP[textualMatch[2].toLowerCase()], textualMatch[3]), textualMatch[0]];
        if (monthFirst) return [normalizeDate(monthFirst[2], MONTHS_MAP[monthFirst[1].toLowerCase()], monthFirst[3]), monthFirst[0]];
        return null;
    };

    const firstDate = extractDate(flightInfoPool);
    if (firstDate) {
        data.date = firstDate[0];
        flightInfoPool = flightInfoPool.replace(firstDate[1], ' ');
        // Try to find a second date for the return leg
        const secondDate = extractDate(flightInfoPool);
        if (secondDate) {
            data.returnDate = secondDate[0];
            flightInfoPool = flightInfoPool.replace(secondDate[1], ' ');
        }
    }

    // --- 4. TIME EXTRACTION (outbound + return) ---
    const parseTime = (pool: string): [string, string] | null => {
        const m = pool.match(/\b(\d{1,2}:\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i);
        if (!m) return null;
        let hour = 0, minutes = '00', period = '';
        if (m[1]) {
            const parts = m[1].split(':');
            hour = parseInt(parts[0]);
            minutes = parts[1];
            period = m[2]?.toLowerCase() || '';
        } else {
            hour = parseInt(m[3]);
            period = m[4].toLowerCase();
        }
        if (period === 'pm' && hour < 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        return [`${hour.toString().padStart(2, '0')}:${minutes}`, m[0]];
    };

    const firstTime = parseTime(flightInfoPool);
    if (firstTime) {
        data.flightTime = firstTime[0];
        flightInfoPool = flightInfoPool.replace(firstTime[1], ' ');
        const secondTime = parseTime(flightInfoPool);
        if (secondTime) {
            data.returnFlightTime = secondTime[0];
            flightInfoPool = flightInfoPool.replace(secondTime[1], ' ');
        }
    }

    // --- 5. CLASS & PARTNER ---
    if (/\bbusiness\b|\bbiz\b|\bexecutiva\b|\bexe\b/i.test(msg)) data.classType = 'EXECUTIVA';
    else if (/\bpremium\b/i.test(msg)) data.classType = 'ECONOMICA PREMIUM';
    else if (/\beconomy\b|\beconomica\b|\beco\b/i.test(msg)) data.classType = 'ECONOMICA';
    else if (/\bfirst\b|\bprimeira\b/i.test(msg)) data.classType = 'PRIMEIRA';

    const partnerMap: { [key: string]: string } = { vs: 'Virgin', dl: 'Delta', la: 'LATAM', ad: 'Azul', af: 'Air France', kl: 'KLM', ib: 'Iberia', tp: 'TAP' };
    for (const code in partnerMap) {
        if (new RegExp(`\\b${code}\\b`, 'i').test(msg)) {
            data.partner = partnerMap[code];
            break;
        }
    }
    if (!data.partner) {
        const fullPartners = ['delta', 'virgin', 'latam', 'azul', 'smiles', 'tap', 'iberia', 'qatar', 'emirates'];
        for (const p of fullPartners) {
            if (msg.includes(p)) {
                data.partner = p.charAt(0).toUpperCase() + p.slice(1);
                break;
            }
        }
    }

    // Final adjustments
    data.adults = Math.max(data.adults, explicitAdults);
    data.children = Math.max(data.children, explicitChildren);
    data.infants = Math.max(data.infants, explicitInfants);
    
    data.hasFlightData = !!(data.origin || data.destination || data.date || data.flightTime);
    
    return data;
}

function normalizeDate(day: string, month: string, year?: string): string {
    const d = day.padStart(2, '0');
    const m = month.padStart(2, '0');
    let y = year || new Date().getFullYear().toString();
    if (y.length === 2) y = `20${y}`;
    return `${d}/${m}/${y}`;
}

function addPassenger(data: ProcessedData, fName: string, lName: string, day: string, month: string, year: string) {
    // fName may contain multiple words (all names except last); lName is always just the last name
    const firstName = fName.split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ');
    const lastName = lName.charAt(0).toUpperCase() + lName.slice(1);
    const birthDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    
    const age = new Date().getFullYear() - parseInt(year);
    if (age >= 12) data.adults++;
    else if (age >= 2) data.children++;
    else data.infants++;

    const femaleNames = new Set(['maria', 'ana', 'julia', 'lucia', 'carla', 'fernanda', 'andressa', 'alicia', 'beatriz', 'camila', 'clara', 'daniela', 'elisa', 'gabriela', 'isabela', 'laura', 'livia', 'luiza', 'manuela', 'mariana', 'nicole', 'paola', 'rafaela', 'sophia', 'valentina', 'conceição', 'vitoria', 'vitória', 'gitty', 'pessy', 'chaya', 'rivka', 'leah', 'rachel', 'sarah', 'miriam', 'esther', 'shoshana', 'tamar', 'yehudit', 'chana', 'devorah', 'malka', 'shira', 'yael', 'hannah', 'abigail', 'emma', 'olivia', 'ava', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'grace', 'zoe', 'chloe', 'penelope', 'riley', 'nora', 'lily', 'eleanor', 'avery', 'ella', 'scarlett', 'aria', 'lucy', 'mila', 'sofia', 'aline', 'bruna', 'carolina', 'diana', 'eduarda', 'flavia', 'giovanna', 'heloisa', 'isadora', 'joana', 'karina', 'leticia', 'marcela', 'natalia', 'patricia', 'renata', 'simone', 'tatiana', 'vanessa', 'yasmin', 'zilda', 'amanda', 'barbara']);
    
    let gender = 'Masculino'; // Default
    const lowerName = fName.toLowerCase();
    
    if (GENDER_DICT[lowerName] === 'Feminino') {
        gender = 'Feminino';
    } else if (GENDER_DICT[lowerName] === 'Masculino') {
        gender = 'Masculino';
    } else if (femaleNames.has(lowerName)) {
        gender = 'Feminino';
    }

    data.passengers.push({
        firstName, lastName, gender, birthDate,
        passportNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
        nationality: 'Estados Unidos',
        passportExpiry: `01/01/${2030 + Math.floor(Math.random() * 5)}`,
        passportIssuanceCountry: 'Estados Unidos'
    });
}
