import * as cheerio from 'cheerio';
import https from 'https';

const getUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => resolve(chunks));
    });
  });
};

(async () => {
    const htmlL2 = await getUrl('https://btebresultszone.com/exam-routines/diploma-in-engineering-tourism-reg-2022-exam-2025');
    const $2 = cheerio.load(htmlL2);
    const l2Items = [];
    $2('a[href^="/exam-routines/"]').each((i, el) => {
       const href = $2(el).attr('href');
       const title = $2(el).find('h3').text();
       if (title && href) {
           l2Items.push({ href: href.replace('/exam-routines', ''), title });
       }
    });
    console.log("L2:", l2Items.slice(0, 3));
    
    const htmlL3 = await getUrl('https://btebresultszone.com/exam-routines/diploma-in-engineering-tourism-reg-2022-exam-2025/surveying-technology-2022');
    const $3 = cheerio.load(htmlL3);
    const routineTable = [];
    $3('tr').each((i, el) => {
        if (i === 0) return; // skip header or we just check tds
        const tds = $3(el).find('td');
        if (tds.length >= 4) {
             routineTable.push({
                 date: $3(tds[0]).text().trim(),
                 code: $3(tds[1]).text().trim(),
                 subject: $3(tds[2]).text().trim(),
                 time: $3(tds[3]).text().trim(),
                 day: tds.length >= 5 ? $3(tds[4]).text().trim() : '',
             });
        }
    });
    console.log("L3:", routineTable.slice(0, 3));
})();
