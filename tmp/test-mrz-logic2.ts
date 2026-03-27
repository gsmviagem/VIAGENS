const lines = [
    "P<FRAPROUSTSSCHARLOTTE<GABRIELLEC<<<<<<<<<|",
    "P<FRABOUALI<SADEMLLLLLLLLLLLLLLLLLLLLLLLLRRKL",
    "P<FRABOUALI<SHALMACLLELLLELLLRRLLLRERESES",
    "P<FRABOUALI<SNABILSLLLSLLLLLLLLLLLLLLLRLR|",
    "P<FRATANGUY<<GABINKLOUISKVALENTIN<<<L<L<LLL<LK",
    "NP<IRLSOKUNBI<<N1YJCOLUFERI<LLLLLLEEEEEEEEESS|-",
    "|PUSANEMETSKY<<ABRAHANSCSCLCLLLLLEEEEESES:",
    "|P<USANEMETSKY<<SARAHSSSSCCL<<<<<<<<<<<<CC<<",
    "THPHAN#4REE2DATUMVANAGITDATEOFASUQDATEDODBIYRANCEWIDECU",
    "PSFRAZEMRISSAMINESLLLLLLLLLLLLLLLLLLLLLLLKLKL"
];

for (let mrzLine1 of lines) {
    const orig = mrzLine1;
    mrzLine1 = mrzLine1.toUpperCase();
    
    // First, replace any end-of-string trailing noise with < (L, S, C, K, E, R, T, !)
    // But be careful not to replace names. Names don't usually consist of LLLLL.
    mrzLine1 = mrzLine1.replace(/[CLSKT12!E]{3,}/g, match => '<'.repeat(match.length));
    
    // Fix separators
    mrzLine1 = mrzLine1.replace(/([A-Z])[SCL]{2}([A-Z])/g, '$1<<$2') 
                       .replace(/<[SCL12!]([A-Z])/g, '<<$1')      
                       .replace(/([A-Z])[SCL12!]<([A-Z])/g, '$1<<$2')
                       .replace(/([A-Z])[SCL]{2,}</g, '$1<<<');
                       
    // Strip prefix
    let issuingCountry = 'N/A';
    let namesPart = mrzLine1;

    const prefixMatch = mrzLine1.match(/^[^PVA<]*([PVA])[<SKLCO0]?([A-Z<]{3})/i);
    if (prefixMatch) {
        issuingCountry = prefixMatch[2].replace(/</g, '').toUpperCase();
        namesPart = mrzLine1.substring(prefixMatch[0].length);
    } else {
        namesPart = mrzLine1.substring(5);
    }

    let lastName = '';
    let firstName = '';

    // Split names. The string usually ends with <<<<<<. We should ignore trailing <
    namesPart = namesPart.replace(/<+$/, '').replace(/\||-|:/g, '').trim();

    // Now split the remaining string by <<
    const nameSplit = namesPart.split('<<');
    
    if (nameSplit.length >= 2) {
        lastName = nameSplit[0].replace(/</g, ' ').trim();
        firstName = nameSplit[1].replace(/</g, ' ').trim();
    } else {
        // Fallback to single <
        const firstAngle = namesPart.indexOf('<');
        if (firstAngle > 0) {
            lastName = namesPart.substring(0, firstAngle).replace(/</g, ' ').trim();
            firstName = namesPart.substring(firstAngle + 1).replace(/</g, ' ').trim();
        } else {
            lastName = namesPart.replace(/</g, ' ').trim();
        }
    }
    
    console.log(`${orig.padEnd(50)} -> [${issuingCountry}] ${lastName} | ${firstName}`);
}
