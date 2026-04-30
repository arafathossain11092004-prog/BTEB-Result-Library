const https = require('https');

https.get("https://btebresultszone.com/api/student-results?roll=936366", (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 500)));
});
