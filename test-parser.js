
function parseFlightMessage(message) {
    const msg = message.toLowerCase();
    const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const data = { adults: 0, children: 0, infants: 0, passengers: [] };

    let explicitAdults = 0;
    const adultMatch = msg.match(/(?:(\d+)\s*(?:adulto|adultos|pax|adults?))|(?:(?:adulto|adultos|pax|adults?)\s*[:\-]?\s*(\d+))/i);
    if (adultMatch) explicitAdults = parseInt(adultMatch[1] || adultMatch[2]);

    const paxA = /([a-zÀ-ÿ\s]+)\s*\(?(?:(\d{1,2})\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(?:(\d{1,2})\s+)?(19\d{2}|20\d{2}|\d{2})\)?/gi;
    let match;
    while ((match = paxA.exec(msg)) !== null) {
        const fullNames = match[1].trim().split(/\s+/);
        if (fullNames.length >= 2) {
            const day = match[2] || match[4];
            const year = match[5];
            let fullYear = parseInt(year);
            if (year.length === 2) fullYear = fullYear > 25 ? 1900 + fullYear : 2000 + fullYear;
            const age = new Date().getFullYear() - fullYear;
            if (age >= 12) data.adults++;
            data.passengers.push({ firstName: fullNames[0], lastName: fullNames.slice(1).join(' '), nationality: 'Estados Unidos', birthDate: `${day}/${months[match[3].toLowerCase()]}/${fullYear}` });
        }
    }
    data.adults = Math.max(data.adults, explicitAdults);
    return data;
}

const testCase1 = `Naftali Horowitz (14 Aug 2002)`;
const testCase2 = `pax: 1`;

console.log("--- TEST CASE 1 (Parentheses) ---");
console.log(JSON.stringify(parseFlightMessage(testCase1), null, 2));
console.log("\n--- TEST CASE 2 (pax: 1) ---");
console.log(JSON.stringify(parseFlightMessage(testCase2), null, 2));
