import * as cheerio from "cheerio";

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const response = await fetch("https://btebresultszone.com/exam-routines", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch exam routines");
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const routines: any[] = [];
    $('a[href^="/exam-routines/"]').each((i, el) => {
       const href = $(el).attr('href');
       const title = $(el).find('div[class*="text-lg font-semibold"]').text();
       const dates = $(el).find('.lucide-calendar').next('span').text();
       
       const bottomText = $(el).find('.flex.gap-4.text-xs.text-gray-600').text();
       
       if (title && href) {
           routines.push({ 
               href: "/exam-routines" + href.replace('/exam-routines', ''), 
               title, 
               dates, 
               bottomText 
           });
       }
    });
    
    return new Response(JSON.stringify({ success: true, data: routines }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
