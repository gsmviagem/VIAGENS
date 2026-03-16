
function parseFlightMessage(message) {
    const msg = message.toLowerCase();
    const months = {
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
    const slashDateMatch = msg.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
    const textualDateMatch = msg.match(new RegExp(`(\\d{1,2})\\s*(?:de\\s+)?(${monthKeys})(?:[\\s,]*(\\d{4}))?`, 'i'));
    const monthFirstMatch = msg.match(new RegExp(`(${monthKeys})\\s*(\\d{1,2})`, 'i'));

    let date = '';
    if (slashDateMatch) {
        const day = slashDateMatch[1].padStart(2, '0');
        const month = slashDateMatch[2].padStart(2, '0');
        const year = slashDateMatch[3] ? (slashDateMatch[3].length === 2 ? `20${slashDateMatch[3]}` : slashDateMatch[3]) : '2026';
        date = `${day}/${month}/${year}`;
    } else if (textualDateMatch) {
        const day = textualDateMatch[1].padStart(2, '0');
        const month = months[textualDateMatch[2].toLowerCase()];
        const year = textualDateMatch[3] || '2026';
        date = `${day}/${month}/${year}`;
    } else if (monthFirstMatch) {
        const month = months[monthFirstMatch[1].toLowerCase()];
        const day = monthFirstMatch[2].padStart(2, '0');
        date = `${day}/${month}/2026`;
    }

    return { date };
}

const testCase1 = `-> Data de ida: 17 de Março ,2026`;
const testCase2 = `-> Data de ida: 20 de Abril 2026`;

console.log("--- TEST CASE 1 (17 de Março ,2026) ---");
console.log(JSON.stringify(parseFlightMessage(testCase1), null, 2));
console.log("\n--- TEST CASE 2 (20 de Abril) ---");
console.log(JSON.stringify(parseFlightMessage(testCase2), null, 2));
