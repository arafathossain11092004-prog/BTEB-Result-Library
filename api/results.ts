import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const type = req.query.type as string;
    const roll = req.query.roll as string;
    const instituteCode = req.query.instituteCode as string;
    const curriculum = req.query.curriculumId as string;
    const regulation = req.query.regulation as string;
    
    // Set CORS headers so that client can request this proxy
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const fetchFromBteb = async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch from BTEB source');
      }
      return await response.json();
    };

    if (roll) {
      // roll may be comma or space separated
      const rollsList = roll.split(/[,\s]+/).map(r => r.trim()).filter(Boolean);
      
      if (rollsList.length === 1) {
        let apiUrl = `https://btebresultszone.com/api/student-results?roll=${rollsList[0]}`;
        if (curriculum) apiUrl += `&curriculumId=${curriculum}`;
        if (regulation) apiUrl += `&regulation=${regulation}`;
        const data = await fetchFromBteb(apiUrl);
        return res.status(200).json(data);
      } else {
        // Multiple rolls
        const maxRolls = Math.min(rollsList.length, 30); // allow max 30 for group
        const promises = rollsList.slice(0, maxRolls).map(async (r) => {
          let apiUrl = `https://btebresultszone.com/api/student-results?roll=${r}`;
          if (curriculum) apiUrl += `&curriculumId=${curriculum}`;
          if (regulation) apiUrl += `&regulation=${regulation}`;
          try {
            const data = await fetchFromBteb(apiUrl);
            return data;
          } catch (err) {
            return null;
          }
        });
        const resultsArray = await Promise.all(promises);
        
        let combinedData: any[] = [];
        resultsArray.forEach(res => {
          if (res && res.success && res.data) {
            combinedData = combinedData.concat(res.data);
          }
        });
        
        return res.status(200).json({ success: true, data: combinedData });
      }
    } else if (type === 'institute' && instituteCode) {
        let apiUrl = `https://btebresultszone.com/api/student-results?instituteCode=${instituteCode}`;
        if (curriculum) apiUrl += `&curriculumId=${curriculum}`;
        if (regulation) apiUrl += `&regulation=${regulation}`;
        const data = await fetchFromBteb(apiUrl);
        return res.status(200).json(data);
    } else {
       return res.status(400).json({ success: false, error: 'Missing roll or instituteCode' });
    }
  } catch (error: any) {
    console.error('API proxy error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
