import { load } from 'cheerio';

async function run() {
  const code = '56055';
  const response = await fetch(`https://btebresultszone.com/institute-results/${code}/15-10-2025`, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const html = await response.text();
  const $ = load(html);
  
  // They probably show 1 File
  const scripts = $('script').map((i, el) => $(el).html()).get();
  const flightScripts = scripts.filter(s => s && s.includes('__next_f'));
  
  const results = [];
  $('a[href$=".pdf"]').each((i, el) => {
    results.push($(el).attr('href'));
  });
  
  console.log("PDF Links:", results);
  
  if (flightScripts.length > 0) {
      const match = flightScripts[flightScripts.length - 1].match(/(\[.*\])/);
      console.log("Length of flightScripts content:", flightScripts[flightScripts.length - 1].length);
      console.log("Has something that looks like students array:", flightScripts[flightScripts.length - 1].includes('students'));
      console.log("Has something like rolls:", flightScripts[flightScripts.length - 1].includes('roll'));
  }
}
run();
