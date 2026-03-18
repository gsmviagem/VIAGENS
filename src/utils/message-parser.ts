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

export function parseFlightMessage(message: string): ProcessedData {
    const msg = message.toLowerCase();

    // Helper for upcoming weekdays
    function getNextWeekdayDate(dayName: string): string {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName.toLowerCase());
        if (targetDay === -1) return '';

        const now = new Date();
        const resultDate = new Date();
        resultDate.setDate(now.getDate() + (targetDay + 7 - now.getDay()) % 7);

        const day = resultDate.getDate().toString().padStart(2, '0');
        const month = (resultDate.getMonth() + 1).toString().padStart(2, '0');
        const year = resultDate.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // 0. Pre-process noise
    let workingMsg = msg.replace(/\b(?:pls|please)\b/g, ' ').trim();

    // Default values
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

    // 1. Route
    const monthSet = new Set(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'january', 'february', 'march', 'april', 'maio', 'june', 'junho', 'july', 'julho', 'august', 'agosto', 'september', 'setembro', 'october', 'outubro', 'november', 'novembro', 'december', 'dezembro']);
    const routeRegex = /\b([a-z]{3})\s*(?:-|to|\/|\s+)\s*([a-z]{3})\b/g;
    const excludedWords = new Set(['eco', 'for', 'pax', 'via', 'the', 'and', 'dep', 'arr', 'pls', 'now', 'day']);
    let routeMatch;
    let finalRouteMatch = null;
    while ((routeMatch = routeRegex.exec(workingMsg)) !== null) {
        const code1 = routeMatch[1].toLowerCase();
        const code2 = routeMatch[2].toLowerCase();
        
        if (!monthSet.has(code1) && !monthSet.has(code2) && !excludedWords.has(code1) && !excludedWords.has(code2)) {
            finalRouteMatch = routeMatch;
            break;
        }
        // Allow overlapping matches for cases like "19 MAR LHR JFK"
        routeRegex.lastIndex = routeMatch.index + 1;
    }
    if (finalRouteMatch) {
        data.origin = finalRouteMatch[1].toUpperCase();
        data.destination = finalRouteMatch[2].toUpperCase();
        workingMsg = workingMsg.replace(finalRouteMatch[0], ' ');
    }

    // 2. Date
    const months: { [key: string]: string } = {
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

    const monthKeys = Object.keys(months).join('|');
    
    // 2a. Check for DD/MM or DD/MM/YYYY
    const slashDateMatch = workingMsg.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    
    // 2b. Check for DD de Month or DD Month
    const textualDateMatch = workingMsg.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthKeys})(?:[\\s,]*(\\d{4}))?`, 'i'));
    
    // 2c. Check for Month DD
    const monthFirstMatch = workingMsg.match(new RegExp(`(${monthKeys})\\s*(\\d{1,2})`, 'i'));

    if (slashDateMatch) {
        const day = slashDateMatch[1].padStart(2, '0');
        const month = slashDateMatch[2].padStart(2, '0');
        const year = slashDateMatch[3] ? (slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3]) : '2026';
        data.date = `${day}/${month}/${year}`;
        workingMsg = workingMsg.replace(slashDateMatch[0], ' ');
    } else if (textualDateMatch) {
        const day = textualDateMatch[1].padStart(2, '0');
        const month = months[textualDateMatch[2].toLowerCase()];
        const year = textualDateMatch[3] || '2026';
        data.date = `${day}/${month}/${year}`;
        workingMsg = workingMsg.replace(textualDateMatch[0], ' ');
    } else if (monthFirstMatch) {
        const month = months[monthFirstMatch[1].toLowerCase()];
        const day = monthFirstMatch[2].padStart(2, '0');
        data.date = `${day}/${month}/2026`;
        workingMsg = workingMsg.replace(monthFirstMatch[0], ' ');
    } else {
        const weekdayMatch = workingMsg.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
        if (weekdayMatch) {
            data.date = getNextWeekdayDate(weekdayMatch[1]);
            workingMsg = workingMsg.replace(weekdayMatch[1], ' ');
        }
    }

    // 3. Time & Flight Number
    const timeMatch = workingMsg.match(/\b(\d{1,2}:\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i);
    let extractedTime = '';
    if (timeMatch) {
        let hour = 0;
        let minutes = '00';
        let period = '';

        if (timeMatch[1]) {
            // HH:MM format
            const parts = timeMatch[1].split(':');
            hour = parseInt(parts[0]);
            minutes = parts[1];
            period = timeMatch[2]?.toLowerCase() || '';
        } else {
            // HH am/pm format
            hour = parseInt(timeMatch[3]);
            period = timeMatch[4].toLowerCase();
        }

        if (period === 'pm' && hour < 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        
        extractedTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
        workingMsg = workingMsg.replace(timeMatch[0], ' ');
    }
    
    // Sanitize operational words out of the working string before looking for passenger names
    workingMsg = workingMsg.replace(/\b(?:vs|dep|arr|rt|ow|for|issue|pax)\b/gi, ' ');

    const flightNoMatch = workingMsg.match(/(?:\s|^)([a-z]{2})\s*(\d{1,4})(?:\s|$)/i);
    if (flightNoMatch) {
        const airlineCode = flightNoMatch[1].toUpperCase();
        // Avoid matching route codes (if it matches origin/destination, skip)
        if (airlineCode !== data.origin && airlineCode !== data.destination) {
            const fNo = `${airlineCode} ${flightNoMatch[2]}`;
            data.flightTime = extractedTime ? `${extractedTime} (${fNo})` : fNo;
        } else {
            data.flightTime = extractedTime;
        }
    } else {
        data.flightTime = extractedTime;
    }

    // 4. Class & Partner
    if (/\bpremium\s*(?:economy|eco)\b/i.test(workingMsg)) {
        data.classType = 'PREMIUM ECONOMY';
    } else if (/\beconomy\b|\beconomica\b|\beco\b/i.test(workingMsg)) {
        data.classType = 'ECONOMICA';
    }
    
    if (/\bbusiness\b|\bexecutiva\b|\bbiz\b/i.test(workingMsg)) {
        data.classType = 'EXECUTIVA';
    }
    
    if (/\bfirst\b|\bprimeira\b/i.test(workingMsg)) {
        data.classType = 'PRIMEIRA';
    }

    const partnerMap: { [key: string]: string } = {
        vs: 'Virgin',
        dl: 'Delta',
        la: 'LATAM',
        ad: 'Azul',
        af: 'Air France',
        kl: 'KLM',
        ib: 'Iberia',
        tp: 'TAP'
    };

    // Try IATA codes first (standalone words)
    const words = msg.split(/\s+/);
    for (const word of words) {
        if (partnerMap[word]) {
            data.partner = partnerMap[word];
            break;
        }
    }

    // Fallback to full names
    if (!data.partner) {
        const fullPartners = ['delta', 'virgin', 'latam', 'azul', 'smiles', 'tap', 'iberia', 'qatar', 'emirates'];
        for (const p of fullPartners) {
            if (msg.includes(p)) {
                data.partner = p.charAt(0).toUpperCase() + p.slice(1);
                break;
            }
        }
    }

    // 5. Explicit Passenger Counts
    let explicitAdults = 0;
    let explicitChildren = 0;
    let explicitInfants = 0;

    // Supports "1 Adulto", "Adultos: 1", "1 pax", "pax: 1"
    const adultMatch = workingMsg.match(/(?:(\d+)\s*(?:adulto|adultos|pax|adults?))|(?:(?:adulto|adultos|pax|adults?)\s*[:\-]?\s*(\d+))/i);
    if (adultMatch) explicitAdults = parseInt(adultMatch[1] || adultMatch[2]);
    
    // Pattern A (Supports "Name (14 Aug 2002)" or "Name 14 Aug 2002")
    const paxA = /([a-zÀ-ÿ\s]{2,})\s*\(?(?:(\d{1,2})\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:(\d{1,2})\s+)?(19\d{2}|20\d{2}|\d{2})\)?/gi;
    const paxB = /([a-zÀ-ÿ\s]{2,})\s*\(?(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\)?/gi;

    let match;
    const foundNames: string[] = [];

    // Pattern A
    while ((match = paxA.exec(workingMsg)) !== null) {
        const fullNames = match[1].trim().split(/\s+/);
        if (fullNames.length >= 2) {
            const fName = fullNames[0];
            const lName = fullNames.slice(1).join(' ');
            foundNames.push(`${fName} ${lName}`);
            const day = match[2] || match[4];
            const monthName = match[3];
            processPassenger(fName, lName, months[monthName.toLowerCase().substring(0, 3)], day, match[5]);
        }
    }

    // Pattern B
    while ((match = paxB.exec(workingMsg)) !== null) {
        const fullNames = match[1].trim().split(/\s+/);
        if (fullNames.length >= 2) {
            const fName = fullNames[0];
            const lName = fullNames.slice(1).join(' ');
            const fullName = `${fName} ${lName}`;
            if (!foundNames.includes(fullName)) {
                processPassenger(fName, lName, match[3], match[2], match[4]);
            }
        }
    }


    function processPassenger(fName: string, lName: string, month: string, day: string, year: string) {
        const firstName = fName.charAt(0).toUpperCase() + fName.slice(1);
        const lastName = lName.charAt(0).toUpperCase() + lName.slice(1);
        const bMonth = month.padStart(2, '0');
        const bDay = day.padStart(2, '0');
        let fullYear = parseInt(year);
        if (year.length === 2) {
            fullYear = fullYear > 25 ? 1900 + fullYear : 2000 + fullYear;
        }

        const birthDate = `${bDay}/${bMonth}/${fullYear}`;
        const currentYear = new Date().getFullYear();
        const age = currentYear - fullYear;

        if (age >= 12) data.adults++;
        else if (age >= 2) data.children++;
        else data.infants++;

        const femaleNamesList = [
            'maria', 'ana', 'julia', 'lucia', 'carla', 'fernanda', 'andressa', 'alicia', 'beatriz', 
            'camila', 'clara', 'daniela', 'elisa', 'gabriela', 'isabela', 'laura', 'livia', 'luiza', 
            'manuela', 'mariana', 'nicole', 'paola', 'rafaela', 'sophia', 'valentina', 'conceição', 
            'vitoria', 'vitória', 'gitty', 'chaya', 'rivka', 'leah', 'rachel', 'sarah', 'miriam', 
            'esther', 'shoshana', 'tamar', 'yehudit', 'chana', 'devorah', 'malka', 'shira', 'yael',
            'hannah', 'abigail', 'emma', 'olivia', 'ava', 'mia', 'charlotte', 'amelia', 'harper', 
            'evelyn', 'grace', 'zoe', 'chloe', 'penelope', 'riley', 'nora', 'lily', 'eleanor', 
            'avery', 'ella', 'scarlett', 'aria', 'lucy', 'mila', 'sofia', 
            'aline', 'bruna', 'carolina', 'diana', 'eduarda', 'flavia', 'giovanna', 'heloisa',
            'isadora', 'joana', 'karina', 'leticia', 'marcela', 'natalia', 'patricia',
            'renata', 'simone', 'tatiana', 'vanessa', 'yasmin', 'zilda', 'amanda', 'barbara'
        ];
        const femaleNamesSet = new Set(femaleNamesList);
        const gender = femaleNamesSet.has(fName.toLowerCase()) ? 'Feminino' : 'Masculino';

        data.passengers.push({
            firstName,
            lastName,
            gender,
            birthDate,
            passportNumber: generateRandomPassport(),
            nationality: 'Estados Unidos',
            passportExpiry: generateRandomExpiry(),
            passportIssuanceCountry: 'Estados Unidos'
        });
    }

    // Finalize counts: Max of names found or explicit counts
    data.adults = Math.max(data.adults, explicitAdults);
    data.children = Math.max(data.children, explicitChildren);
    data.infants = Math.max(data.infants, explicitInfants);

    return data;
}

function generateRandomPassport(): string {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateRandomExpiry(): string {
    const year = 2030 + Math.floor(Math.random() * 5);
    const month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0');
    const day = (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0');
    return `${day}/${month}/${year}`;
}
