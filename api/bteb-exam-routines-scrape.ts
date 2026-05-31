import * as cheerio from "cheerio";

export const config = {
  runtime: 'edge',
};

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
    const urlParams = new URL(req.url).searchParams;
    const targetPath = urlParams.get('path') as string;
    
    if (!targetPath) {
      return new Response(JSON.stringify({ success: false, error: "Path missing" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(`https://btebresultszone.com/exam-routines${targetPath}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    
    if (!response.ok) throw new Error("Failed to fetch");
    const html = await response.text();
    const $ = cheerio.load(html);

    // Determine level
    const pathParts = targetPath.split('/').filter(Boolean);

    if (pathParts.length === 1) {
      // Level 2 (Program -> list of technologies)
      const items: any[] = [];
      $('a[href^="/exam-routines/"]').each((i, el) => {
         const href = $(el).attr('href');
         if (!href) return;
         const titleNode = $(el).find('h3');
         const badgeText = titleNode.find('[data-slot="badge"]').text();
         const fullText = titleNode.text();
         let title = fullText;
         if (badgeText) {
           title = fullText.replace(badgeText, '').trim();
         }
         
         if (!titleNode.length) {
            const divTitle = $(el).find('div[class*="text-lg font-semibold"]').text();
            if (divTitle) title = divTitle;
         }

         if (title && href) {
             const cleanHref = href.replace('/exam-routines', '');
             if (cleanHref.endsWith('/customize') || cleanHref.endsWith('/all-technologies')) {
                return;
             }
             items.push({ 
                 href: "/exam-routines" + cleanHref, 
                 title,
                 badge: badgeText || ''
             });
         }
      });
      return new Response(JSON.stringify({ success: true, type: 'program', data: items }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } else {
      // Level 3 (Technology -> list of subjects and dates)
      const semestersData: any[] = [];
      $('div[data-slot="card"]').each((i, el) => {
          const table = $(el).find('table');
          if (table.length === 0) return;
          
          const title = $(el).find('div[data-slot="card-title"]').text().trim();
          const headerText = $(el).find('div[data-slot="card-header"]').text().trim();
          const semesterName = headerText.replace(title, '').trim() || `Table ${semestersData.length + 1}`;
          
          const routineTable: any[] = [];
          table.find('tr').each((j, tr) => {
              const tds = $(tr).find('td');
              if (tds.length >= 4) {
                   routineTable.push({
                       date: $(tds[0]).text().trim(),
                       code: $(tds[1]).text().trim(),
                       subject: $(tds[2]).text().trim(),
                       time: $(tds[3]).text().trim(),
                       day: tds.length >= 5 ? $(tds[4]).text().trim() : '',
                   });
              }
          });
          
          semestersData.push({ semester: semesterName, routine: routineTable });
      });

      // If no cards found, fallback to generic table scan
      if (semestersData.length === 0) {
         const routineTable: any[] = [];
         $('tr').each((i, el) => {
             const tds = $(el).find('td');
             if (tds.length >= 4) {
                  routineTable.push({
                      date: $(tds[0]).text().trim(),
                      code: $(tds[1]).text().trim(),
                      subject: $(tds[2]).text().trim(),
                      time: $(tds[3]).text().trim(),
                      day: tds.length >= 5 ? $(tds[4]).text().trim() : '',
                  });
             }
         });
         semestersData.push({ semester: 'All', routine: routineTable });
      }

      const pageTitle = $('h1').text().trim() || "Exam Routine";

      return new Response(JSON.stringify({ success: true, type: 'technology', title: pageTitle, data: semestersData }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
