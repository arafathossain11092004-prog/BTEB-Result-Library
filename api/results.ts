export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const urlParams = new URL(req.url).searchParams;
    const type = urlParams.get('type') as string;
    const roll = urlParams.get('roll') as string;
    const instituteCode = urlParams.get('instituteCode') as string;
    const curriculum = urlParams.get('curriculumId') as string;
    const regulation = urlParams.get('regulation') as string;
    
    // Set CORS headers so that client can request this proxy
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const fetchFromBteb = async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch from BTEB source: ' + response.status + ' ' + response.statusText);
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
        return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
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
        
        return new Response(JSON.stringify({ success: true, data: combinedData }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
    } else if (type === 'institute' && instituteCode) {
        let apiUrl = `https://btebresultszone.com/api/student-results?instituteCode=${instituteCode}`;
        if (curriculum) apiUrl += `&curriculumId=${curriculum}`;
        if (regulation) apiUrl += `&regulation=${regulation}`;
        const data = await fetchFromBteb(apiUrl);
        return new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } else {
       return new Response(JSON.stringify({ success: false, error: 'Missing roll or instituteCode' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  } catch (error: any) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
  }
}
