import https from 'https';

const getUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'RSC': '1'
      }
    }, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => resolve(chunks));
    });
  });
};

(async () => {
    const rsc = await getUrl('https://btebresultszone.com/exam-routines');
    import('fs').then(fs => fs.writeFileSync('page.rsc', rsc));
    console.log("RSC payload saved");
})();
