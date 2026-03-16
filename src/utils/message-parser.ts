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
    const routeMatch = msg.match(/([a-z]{3})\s*(?:-|to|\/)\s*([a-z]{3})/);
    if (routeMatch) {
        data.origin = routeMatch[1].toUpperCase();
        data.destination = routeMatch[2].toUpperCase();
    }

    // 2. Date
    const months: { [key: string]: string } = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12'
    };

    const monthKeys = Object.keys(months).join('|');
    
    // Check for DD/MM or DD/MM/YYYY
    const slashDateMatch = msg.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    if (slashDateMatch) {
        const day = slashDateMatch[1].padStart(2, '0');
        const month = slashDateMatch[2].padStart(2, '0');
        const year = slashDateMatch[3] ? (slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3]) : '2026';
        data.date = `${day}/${month}/${year}`;
    } else {
        const dateMatch = msg.match(new RegExp(`(${monthKeys})\\s*(\\d{1,2})`, 'i'));
        if (dateMatch) {
            const month = months[dateMatch[1].toLowerCase()];
            const day = dateMatch[2].padStart(2, '0');
            data.date = `${day}/${month}/2026`;
        } else {
            const weekdayMatch = msg.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
            if (weekdayMatch) {
                data.date = getNextWeekdayDate(weekdayMatch[1]);
            }
        }
    }

    // 3. Time & Flight Number
    const timeMatch = msg.match(/(\d{1,2}:\d{2})\s*(am|pm)?|(\d{1,2})\s*(am|pm)/i);
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
            period = timeMatch[2]?.toLowerCase();
        } else {
            // HH am/pm format
            hour = parseInt(timeMatch[3]);
            period = timeMatch[4].toLowerCase();
        }

        if (period === 'pm' && hour < 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        
        extractedTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
    }

    const flightNoMatch = msg.match(/(?:\s|^)([a-z]{2})\s*(\d{1,4})(?:\s|$)/i);
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
    if (msg.includes('premium economy')) data.classType = 'PREMIUM ECONOMY';
    else if (msg.includes('economy') || msg.includes('economica')) data.classType = 'ECONOMICA';
    
    if (msg.includes('business') || msg.includes('executiva')) data.classType = 'EXECUTIVA';
    if (msg.includes('first') || msg.includes('primeira')) data.classType = 'PRIMEIRA';

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
    const adultMatch = msg.match(/(?:(\d+)\s*(?:adulto|adultos|pax|adults?))|(?:(?:adulto|adultos|pax|adults?)\s*[:\-]?\s*(\d+))/i);
    if (adultMatch) explicitAdults = parseInt(adultMatch[1] || adultMatch[2]);
    
    // Pattern A (Supports "Name (14 Aug 2002)" or "Name 14 Aug 2002")
    const paxA = /([a-zÀ-ÿ\s]+)\s*\(?(?:(\d{1,2})\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:(\d{1,2})\s+)?(19\d{2}|20\d{2}|\d{2})\)?/gi;
    const paxB = /([a-zÀ-ÿ\s]+)\s*\(?(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})\)?/gi;

    let match;
    const foundNames: string[] = [];

    // Pattern A
    while ((match = paxA.exec(msg)) !== null) {
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
    while ((match = paxB.exec(msg)) !== null) {
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

        const femaleNames = ['maria', 'ana', 'julia', 'lucia', 'carla', 'fernanda', 'andressa', 'alicia', 'beatriz', 'camila', 'clara', 'daniela', 'elisa', 'gabriela', 'isabela', 'laura', 'livia', 'luiza', 'manuela', 'mariana', 'nicole', 'paola', 'rafaela', 'sophia', 'valentina', 'conceição', 'vitoria', 'vitória'];
        const gender = femaleNames.includes(fName.toLowerCase()) ? 'Feminino' : 'Masculino';

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
