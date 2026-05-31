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
    const urlParams = new URL(req.url).searchParams;
    const code = urlParams.get('code') as string;
    const date = urlParams.get('date') as string;
    
    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Code missing" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (date) {
      // code and date
      const response = await fetch(
        `https://btebresultszone.com/institute-results/${code}/${date}`,
        {
          headers: {
            Accept: "text/html",
            "User-Agent": "Mozilla/5.0",
          },
        },
      );
      if (!response.ok)
        return new Response(JSON.stringify({ success: false, error: "BTEB Server Error" }), { status: response.status, headers: corsHeaders });

      const html = await response.text();
      const $ = cheerio.load(html);

      const pdfs: string[] = [];
      $('a[href$=".pdf"]').each((i, el) => {
        const href = $(el).attr("href");
        if (href) pdfs.push(href);
      });

      return new Response(JSON.stringify({ success: true, pdfs }), { status: 200, headers: corsHeaders });

    } else {
      // just code
      const response = await fetch(
        `https://btebresultszone.com/institute-results/${code}`,
        {
          headers: {
            Accept: "text/html",
            "User-Agent": "Mozilla/5.0",
          },
        },
      );
      if (!response.ok)
        return new Response(JSON.stringify({ success: false, error: "BTEB Server Error" }), { status: response.status, headers: corsHeaders });

      const html = await response.text();
      const $ = cheerio.load(html);

      let instituteName = $("h1, h2, h3")
        .first()
        .text()
        .replace("Institute ", "")
        .trim();
      const titleText = $("title").text();
      if (titleText && titleText.includes("|")) {
        instituteName = titleText.split("|")[0].replace(`[${code}]`, "").trim();
      }

      const results: any[] = [];
      $(`a[href^='/institute-results/${code}/']`).each((i, el) => {
        const href = $(el).attr("href");
        const parts = href?.split("/") || [];
        const dateStr = parts[parts.length - 1];

        const card = $(el).closest(
          '.rounded-xl, .shadow-sm, [data-slot="card"], .border-gray-100',
        );
        let rawText = card.text() || "";

        let fileCount = "Unknown";
        let matchFile = rawText.match(/(\d+) File[s]?/);
        if (matchFile) fileCount = matchFile[0];

        let passed = "",
          failed = "",
          total = "",
          curr = "";
        let matchPass = rawText.match(/Passed([\d.]+%)\s*(\d+)/);
        if (matchPass) passed = `${matchPass[1]} (${matchPass[2]})`;

        let matchFail = rawText.match(/Failed([\d.]+%)\s*(\d+)/);
        if (matchFail) failed = `${matchFail[1]} (${matchFail[2]})`;

        let matchTotal = rawText.match(/Total.*?(\d+)/);
        if (matchTotal) total = matchTotal[1];

        results.push({
          href,
          dateStr,
          rawText,
          stats: { fileCount, passed, failed, total },
        });
      });

      return new Response(JSON.stringify({ success: true, instituteName, data: results }), { status: 200, headers: corsHeaders });
    }

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, error: "Server error" }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
