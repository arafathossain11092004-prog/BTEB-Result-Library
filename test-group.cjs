const https = require('https');

const data = JSON.stringify({
  startRoll: "936366", endRoll: "936370", curriculumId: "diploma_in_engineering"
});

const req = https.request('https://btebresultszone.com/api/group-results', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let r = '';
  res.on('data', chunk => r += chunk);
  res.on('end', () => console.log(r.substring(0, 500)));
});
req.write(data);
req.end();
