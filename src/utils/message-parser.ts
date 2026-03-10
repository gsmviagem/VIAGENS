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
    passenger: {
        firstName: string;
        lastName: string;
        gender: string;
        birthDate: string;
        passportNumber: string;
        nationality: string;
        passportExpiry: string;
        passportIssuanceCountry: string;
    };
}

export function parseFlightMessage(message: string): ProcessedData {
    const msg = message.toLowerCase();

    // Default values (leave blank if not identified, except for randomized/fixed logic ones)
    const data: ProcessedData = {
        origin: '',
        destination: '',
        date: '',
        classType: '',
        partner: '',
        adults: 1,
        children: 0,
        infants: 0,
        flightTime: '',
        passenger: {
            firstName: '',
            lastName: '',
            gender: 'Masculino',
            birthDate: '',
            passportNumber: generateRandomPassport(),
            nationality: 'Estados Unidos',
            passportExpiry: generateRandomExpiry(),
            passportIssuanceCountry: 'Estados Unidos'
        }
    };

    // 1. Extract Route (e.g. lhr-jfk or lhr/jfk)
    const routeMatch = msg.match(/([a-z]{3})[-/]([a-z]{3})/);
    if (routeMatch) {
        data.origin = routeMatch[1].toUpperCase();
        data.destination = routeMatch[2].toUpperCase();
    }

    // 2. Extract Date (e.g. mar10)
    const months: { [key: string]: string } = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const dateMatch = msg.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})/);
    if (dateMatch) {
        const month = months[dateMatch[1]];
        const day = dateMatch[2].padStart(2, '0');
        data.date = `${day}/${month}/2026`;
    }

    // 3. Extract Time (e.g. 8pm)
    const timeMatch = msg.match(/(\d{1,2})\s*(am|pm)/);
    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const period = timeMatch[2];
        if (period === 'pm' && hour < 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        data.flightTime = `${hour.toString().padStart(2, '0')}:00`;
    }

    // 4. Extract Passenger Name & Birthday (e.g. Jacob halberstam march 25 85)
    // Looking for a name pattern followed by a birth date
    const nameBirthMatch = msg.match(/([a-z]+)\s+([a-z]+)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s+(\d{2})/);
    if (nameBirthMatch) {
        data.passenger.firstName = nameBirthMatch[1].charAt(0).toUpperCase() + nameBirthMatch[1].slice(1);
        data.passenger.lastName = nameBirthMatch[2].charAt(0).toUpperCase() + nameBirthMatch[2].slice(1);
        const bMonth = months[nameBirthMatch[3].substring(0, 3)];
        const bDay = nameBirthMatch[4].padStart(2, '0');
        const bYear = parseInt(nameBirthMatch[5]) > 25 ? '19' + nameBirthMatch[5] : '20' + nameBirthMatch[5];
        data.passenger.birthDate = `${bDay}/${bMonth}/${bYear}`;
    }

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
