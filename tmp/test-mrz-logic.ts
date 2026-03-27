import * as fs from 'fs';
import { parseMRZ } from '../src/utils/mrz-parser';

// Read all raw OCR texts from the log file
const logText = fs.readFileSync('C:/DIMAIS CORP/DIMAIS HUB/gsmviagem-hub/tmp/ocr-results.txt', 'utf-8');
const blocks = logText.split('====================');

for (const block of blocks) {
    if (!block.trim()) continue;
    
    let rawOCR = '';
    const lines = block.split('\n');
    let inRaw = false;
    for (const l of lines) {
        if (l.startsWith('--- RAW OCR ---')) { inRaw = true; continue; }
        if (l.startsWith('--- PARSED ---')) { inRaw = false; continue; }
        if (inRaw) rawOCR += l + '\n';
    }
    
    if (rawOCR) {
        console.log(`\n\n=== TEXT SNIPPET ===`);
        // Let's run a simulated new parser on `rawOCR`
        
        const cleanOCRText = (str: string) => str.toUpperCase().replace(/«/g, '<<').replace(/[\(\[\{]/g, '<').replace(/\s+/g, '');
        const cleanedLines = rawOCR.split('\n').map(cleanOCRText).filter(l => l.length > 25 && !/[a-z]/.test(l));
        
        const mrz2Regex = /[A-Z<]{3}[\dOISBQC]{6}[\dOISBQC][MF<X][\dOISBQC]{6}/;
        let line2Index = cleanedLines.findIndex(l => mrz2Regex.test(l));

        let mrzLine1 = '';
        let mrzLine2 = '';

        if (line2Index > 0) {
            mrzLine1 = cleanedLines[line2Index - 1];
            mrzLine2 = cleanedLines[line2Index];
        } else {
            const longLines = cleanedLines.filter(l => l.length > 35);
            if (longLines.length >= 2) {
                mrzLine1 = longLines[longLines.length - 2];
                mrzLine2 = longLines[longLines.length - 1];
            } else if (cleanedLines.length >= 2) {
                mrzLine1 = cleanedLines[cleanedLines.length - 2];
                mrzLine2 = cleanedLines[cleanedLines.length - 1];
            }
        }
        
        console.log("LINE 1: " + mrzLine1);
        console.log("LINE 2: " + mrzLine2);
        
        if (!mrzLine1 || !mrzLine2) {
            console.log("FAILED to find lines");
            continue;
        }

        // Clean up LLL, CCCCC to <<<<<
        mrzLine1 = mrzLine1.replace(/[CLSKT12!]{3,}/g, match => '<'.repeat(match.length));
        mrzLine2 = mrzLine2.replace(/[CLSKT1!]{3,}/g, match => '<'.repeat(match.length));
        mrzLine1 = mrzLine1.replace(/<[CFLSK1]{2}/g, '<<<').replace(/[CFLSK1]{2}</g, '<<<');
        
        // Pad to 44
        mrzLine1 = (mrzLine1 + '<'.repeat(44)).substring(0, 44);

        // EXTRACTION
        const issuingCountry = mrzLine1.substring(2, 5).replace(/</g, '');
        const namesPart = mrzLine1.substring(5);
        // Sometimes Tesseract misses the double << entirely, but namesPart is Last<First<<<<<<
        // A single < also means space if there's no <<. If no << is found, assume first < is the separator!
        let nameSplit = namesPart.split('<<');
        if (nameSplit.length < 2 || (!nameSplit[1] && namesPart.includes('<'))) {
            const firstAngle = namesPart.indexOf('<');
            if (firstAngle > 0) {
               nameSplit = [namesPart.substring(0, firstAngle), namesPart.substring(firstAngle + 1).replace(new RegExp('^<+'), '')];
            }
        }
        
        let lastName = nameSplit[0] ? nameSplit[0].replace(/</g, ' ').trim() : '';
        let firstName = nameSplit[1] ? nameSplit[1].replace(/</g, ' ').trim() : '';
        console.log("LAST: " + lastName + " | FIRST: " + firstName);
    }
}
