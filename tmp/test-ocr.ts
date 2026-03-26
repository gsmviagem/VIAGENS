import Tesseract from 'tesseract.js';
import { parseMRZ } from '../src/utils/mrz-parser';
import fs from 'fs';
import path from 'path';

async function testImage(imagePath: string) {
    console.log(`Testing image: ${imagePath}`);
    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
        console.log("--- RAW TESSERACT OUTPUT ---");
        console.log(text);
        console.log("----------------------------");
        
        const result = parseMRZ(text);
        console.log("--- PARSED RESULT ---");
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

// I will run this via ts-node or just compile and run.
// Wait, do I have the image file path? The user provided the image through the chat interface. I need to get the file path.
