const fs = require('fs');
const readline = require('readline');

async function run() {
  const fileStream = fs.createReadStream('/Users/courage/Documents/Titik Temu/titiktemu/public/Harga Rumah Kota Bandung/results_cleaned.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  
  const locations = new Set();
  let firstLine = true;
  for await (const line of rl) {
    if (firstLine) { firstLine = false; continue; }
    // Parse CSV line correctly since some fields have commas inside quotes
    const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
    let match;
    const parts = [];
    let insideQuote = false;
    let currentPart = '';
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            insideQuote = !insideQuote;
        } else if (line[i] === ',' && !insideQuote) {
            parts.push(currentPart);
            currentPart = '';
        } else {
            currentPart += line[i];
        }
    }
    parts.push(currentPart);
    
    if (parts.length >= 2) {
      locations.add(parts[1].replace(/"/g, '').trim());
    }
  }
  console.log(Array.from(locations));
}
run();
