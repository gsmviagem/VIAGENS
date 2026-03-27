import Tesseract from 'tesseract.js';
import { parseMRZ } from '../src/utils/mrz-parser';
import * as fs from 'fs';
import * as path from 'path';

const dirPath = 'c:/DIMAIS CORP/DIMAIS HUB/passportes';
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));

async function testAll() {
    console.log(`Found ${files.length} images to test.`);
    let outString = '';
    
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        try {
            console.log(`Processing: ${file}...`);
            const worker = await Tesseract.createWorker('eng');
            const { data: { text } } = await worker.recognize(fullPath);
            await worker.terminate();
            
            const result = parseMRZ(text);
            outString += `\n====================\nFILE: ${file}\n`;
            outString += `--- RAW OCR ---\n${text}\n--- PARSED ---\n${JSON.stringify(result, null, 2)}\n`;
        } catch (e) {
            console.error(`Error on ${file}:`, e);
        }
    }
    
    fs.writeFileSync('C:/DIMAIS CORP/DIMAIS HUB/gsmviagem-hub/tmp/ocr-results.txt', outString);
    console.log('Done! Results written to tmp/ocr-results.txt');
}

testAll();
