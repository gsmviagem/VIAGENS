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
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    const dateMatch = msg.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{1,2})/);
    if (dateMatch) {
        const month = months[dateMatch[1]];
        const day = dateMatch[2].padStart(2, '0');
        data.date = `${day}/${month}/2026`;
    } else {
        const weekdayMatch = msg.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
        if (weekdayMatch) {
            data.date = getNextWeekdayDate(weekdayMatch[1]);
        }
    }

    // 3. Time
    const timeMatch = msg.match(/(\d{1,2})\s*(am|pm)/);
    if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const period = timeMatch[2];
        if (period === 'pm' && hour < 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        data.flightTime = `${hour.toString().padStart(2, '0')}:00`;
    }

    // 4. Class & Partner
    if (msg.includes('economy') || msg.includes('economica')) data.classType = 'ECONOMICA';
    if (msg.includes('business') || msg.includes('executiva')) data.classType = 'EXECUTIVA';
    if (msg.includes('first') || msg.includes('primeira')) data.classType = 'PRIMEIRA';

    const partners = ['delta', 'virgin', 'latam', 'azul', 'smiles', 'tap', 'iberia', 'qatar', 'emirates'];
    for (const p of partners) {
        if (msg.includes(p)) {
            data.partner = p.charAt(0).toUpperCase() + p.slice(1);
            break;
        }
    }

    // 6. Multi-Passenger & Age Categorization
    // Regex to find: Name LastName Month Day Year
    // Using global flag to find multiple
    const passengerRegex = /([a-z]+)\s+([a-z]+)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\s+(\d{2}|19\d{2}|20\d{2})/gi;
    let match;

    while ((match = passengerRegex.exec(msg)) !== null) {
        const firstName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        const lastName = match[2].charAt(0).toUpperCase() + match[2].slice(1);
        const bMonth = months[match[3].toLowerCase().substring(0, 3)];
        const bDay = match[4].padStart(2, '0');
        let rawYear = match[5];
        let fullYear = parseInt(rawYear);
        if (rawYear.length === 2) {
            fullYear = fullYear > 25 ? 1900 + fullYear : 2000 + fullYear;
        }

        const birthDate = `${bDay}/${bMonth}/${fullYear}`;

        // Categorization (Reference 2026)
        const age = 2026 - fullYear;
        if (age >= 12) data.adults++;
        else if (age >= 2) data.children++;
        else data.infants++;

        // Infer gender (very basic dictionary)
        const femaleNames = ['maria', 'ana', 'julia', 'julia', 'lucia', 'carla', 'fernanda', 'andressa', 'alicia', 'beatriz', 'camila', 'clara', 'daniela', 'elisa', 'gabriela', 'isabela', 'laura', 'livia', 'luiza', 'manuela', 'mariana', 'nicole', 'paola', 'rafaela', 'sophia', 'valentina'];
        const gender = femaleNames.includes(match[1].toLowerCase()) ? 'Feminino' : 'Masculino';

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
