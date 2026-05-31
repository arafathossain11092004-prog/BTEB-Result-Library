import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function run() {
    try {
        const fileBuffer = fs.readFileSync('test.pdf');
        const data = await pdfParse(fileBuffer);
        const textLines = data.text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        console.log("Total lines:", textLines.length);
        console.log(textLines.slice(0, 100));
    } catch(e) {
        console.log("No test.pdf found", e);
    }
}
run();
