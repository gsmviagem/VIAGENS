import * as fs from 'fs';
import { parseMRZ } from '../src/utils/mrz-parser';

const logText = fs.readFileSync('C:/DIMAIS CORP/DIMAIS HUB/gsmviagem-hub/tmp/ocr-results.txt', 'utf-8');
const blocks = logText.split('====================');

for (const block of blocks) {
    if (!block.trim()) continue;
    
    let rawOCR = '';
    let currFile = '';
    const lines = block.split('\n');
    let inRaw = false;
    for (const l of lines) {
        if (l.startsWith('FILE: ')) { currFile = l.substring(6).trim(); }
        if (l.startsWith('--- RAW OCR ---')) { inRaw = true; continue; }
        if (l.startsWith('--- PARSED ---')) { inRaw = false; continue; }
        if (inRaw) rawOCR += l + '\n';
    }
    
    if (rawOCR) {
        console.log(`\n=== FILE: ${currFile} ===`);
        const result = parseMRZ(rawOCR);
        if (result) {
            console.log(`LAST: ${result.lastName} | FIRST: ${result.firstName} | NAT: ${result.nationality} | ISS: ${result.passportIssuanceCountry}`);
        } else {
            console.log("FAILED TO PARSE MRZ");
        }
    }
}
