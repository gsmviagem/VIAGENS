export interface PassengerData {
    firstName: string;
    lastName: string;
    gender: string;
    birthDate: string;
    passportNumber: string;
    nationality: string;
    passportExpiry: string;
    passportIssuanceCountry: string;
}

export interface ProcessedData {
    origin: string;
    destination: string;
    date: string;
    classType: string;
    partner: string;
    adults: number;
    children: number;
    infants: number;
    flightTime: string;
    passengers: PassengerData[];
}

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

export function parseFlightMessage(message: string): ProcessedData {
    // 0. Initial Sanitization
    let msg = message.toLowerCase().replace(/\t/g, ' '); // Replace tabs with spaces
    msg = msg.replace(/\b(?:pls|please)\b/g, ' '); // Remove noise
    
    const data: ProcessedData = {
        origin: '',
        destination: '',
        date: '',
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
    const namePart = /([a-zÀ-ÿ]{2,}(?:\s+[a-zÀ-ÿ]{2,})+)/.source;
    const datePart = new RegExp(
        `(?:` +
        `(\\d{1,2})[/-](\\d{1,2})[/-](\\d{2,4})` + // 02/02/1982
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

        if (match[2]) { // Slashed: DD/MM/YYYY
            birthDay = match[2];
            birthMonth = match[3];
            birthYear = match[4];
        } else if (match[5]) { // Month-first: Nov. 28, 1981
            birthMonth = MONTHS_MAP[match[5].toLowerCase()];
            birthDay = match[6] || match[7] || '01'; // Handle Month Year or Month Day Year
            birthYear = match[8];
        } else if (match[9]) { // Day-first textual: 16 Feb 2021
            birthDay = match[9];
            birthMonth = MONTHS_MAP[match[10].toLowerCase()];
            birthYear = match[11];
        }

        if (names.length >= 2 && birthYear) {
            const fName = names[0];
            const lName = names.slice(1).join(' ');
            
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
    const adultMatch = msg.match(/(?:(\d+)\s*(?:adulto|adultos|pax|adults?))|(?:(?:adulto|adultos|pax|adults?)\s*[:\-]?\s*(\d+))/i);
    const explicitAdults = adultMatch ? parseInt(adultMatch[1] || adultMatch[2]) : 0;

    // Remove passengers from the "Flight Info Pool"
    let flightInfoPool = msg;
    for (const pStr of passengersToRemove) {
        flightInfoPool = flightInfoPool.replace(pStr, ' ');
    }

    // --- 2. ROUTE EXTRACTION ---
    const routeRegex = /\b([a-z]{3})\s*(?:-|to|\/|\s+)\s*([a-z]{3})\b/g;
    const excludedWords = new Set(['eco', 'for', 'pax', 'via', 'the', 'and', 'dep', 'arr', 'pls', 'now', 'day']);
    
    let routeMatch;
    while ((routeMatch = routeRegex.exec(flightInfoPool)) !== null) {
        const code1 = routeMatch[1].toLowerCase();
        const code2 = routeMatch[2].toLowerCase();
        if (!excludedWords.has(code1) && !excludedWords.has(code2)) {
            data.origin = code1.toUpperCase();
            data.destination = code2.toUpperCase();
            flightInfoPool = flightInfoPool.replace(routeMatch[0], ' ');
            break;
        }
    }

    // --- 3. FLIGHT DATE EXTRACTION ---
    // Search in the cleaned pool
    const slashDateMatch = flightInfoPool.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    const textualDateMatch = flightInfoPool.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})[a-z.]*(?:[\\s,]*(\\d{4}))?`, 'i'));
    const monthFirstMatch = flightInfoPool.match(new RegExp(`(${monthNames})[a-z.]*\\s*(\\d{1,2})(?:[\\s,]*(\\d{4}))?`, 'i'));

    if (slashDateMatch) {
        data.date = normalizeDate(slashDateMatch[1], slashDateMatch[2], slashDateMatch[3]);
        flightInfoPool = flightInfoPool.replace(slashDateMatch[0], ' ');
    } else if (textualDateMatch) {
        data.date = normalizeDate(textualDateMatch[1], MONTHS_MAP[textualDateMatch[2].toLowerCase()], textualDateMatch[3]);
        flightInfoPool = flightInfoPool.replace(textualDateMatch[0], ' ');
    } else if (monthFirstMatch) {
        data.date = normalizeDate(monthFirstMatch[2], MONTHS_MAP[monthFirstMatch[1].toLowerCase()], monthFirstMatch[3]);
        flightInfoPool = flightInfoPool.replace(monthFirstMatch[0], ' ');
    }

    // --- 4. TIME EXTRACTION ---
    const timeMatch = flightInfoPool.match(/\b(\d{1,2}:\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i);
    if (timeMatch) {
        let hour = 0;
        let minutes = '00';
        let period = '';

        if (timeMatch[1]) {
            const parts = timeMatch[1].split(':');
            hour = parseInt(parts[0]);
            minutes = parts[1];
            period = timeMatch[2]?.toLowerCase() || '';
        } else {
            hour = parseInt(timeMatch[3]);
            period = timeMatch[4].toLowerCase();
        }

        if (period === 'pm' && hour < 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        
        data.flightTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
        flightInfoPool = flightInfoPool.replace(timeMatch[0], ' ');
    }

    // --- 5. CLASS & PARTNER ---
    if (/\bpremium\s*(?:economy|eco)\b/i.test(msg)) data.classType = 'PREMIUM ECONOMY';
    else if (/\beconomy\b|\beconomica\b|\beco\b/i.test(msg)) data.classType = 'ECONOMICA';
    else if (/\bbusiness\b|\bexecutiva\b|\bbiz\b/i.test(msg)) data.classType = 'EXECUTIVA';
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
    const firstName = fName.charAt(0).toUpperCase() + fName.slice(1);
    const lastName = lName.charAt(0).toUpperCase() + lName.slice(1);
    const birthDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    
    const age = new Date().getFullYear() - parseInt(year);
    if (age >= 12) data.adults++;
    else if (age >= 2) data.children++;
    else data.infants++;

    const femaleNames = new Set(['maria', 'ana', 'julia', 'lucia', 'carla', 'fernanda', 'andressa', 'alicia', 'beatriz', 'camila', 'clara', 'daniela', 'elisa', 'gabriela', 'isabela', 'laura', 'livia', 'luiza', 'manuela', 'mariana', 'nicole', 'paola', 'rafaela', 'sophia', 'valentina', 'conceição', 'vitoria', 'vitória', 'gitty', 'pessy', 'chaya', 'rivka', 'leah', 'rachel', 'sarah', 'miriam', 'esther', 'shoshana', 'tamar', 'yehudit', 'chana', 'devorah', 'malka', 'shira', 'yael', 'hannah', 'abigail', 'emma', 'olivia', 'ava', 'mia', 'charlotte', 'amelia', 'harper', 'evelyn', 'grace', 'zoe', 'chloe', 'penelope', 'riley', 'nora', 'lily', 'eleanor', 'avery', 'ella', 'scarlett', 'aria', 'lucy', 'mila', 'sofia', 'aline', 'bruna', 'carolina', 'diana', 'eduarda', 'flavia', 'giovanna', 'heloisa', 'isadora', 'joana', 'karina', 'leticia', 'marcela', 'natalia', 'patricia', 'renata', 'simone', 'tatiana', 'vanessa', 'yasmin', 'zilda', 'amanda', 'barbara']);
    const gender = femaleNames.has(fName.toLowerCase()) ? 'Feminino' : 'Masculino';

    data.passengers.push({
        firstName, lastName, gender, birthDate,
        passportNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
        nationality: 'Estados Unidos',
        passportExpiry: `01/01/${2030 + Math.floor(Math.random() * 5)}`,
        passportIssuanceCountry: 'Estados Unidos'
    });
}
