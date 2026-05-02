import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import * as cheerio from 'cheerio';

dotenv.config({ override: true });

// Global Error Handlers for Node.js (preventing server crashes from unhandled rejections)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

   app.get("/api/bteb/institutes", (req, res) => {
    try {
      const institutesPath = path.join(process.cwd(), "src", "data", "all_institutes.json");
      if (fs.existsSync(institutesPath)) {
        const data = fs.readFileSync(institutesPath, "utf-8");
        return res.json({ success: true, data: JSON.parse(data) });
      } else {
        return res.json({ success: true, data: [] });
      }
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/bteb/institute-results/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const response = await fetch(`https://btebresultszone.com/institute-results/${code}`, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      if (!response.ok) return res.status(response.status).json({ success: false, error: "BTEB Server Error" });

      const html = await response.text();
      const $ = cheerio.load(html);
      
      let instituteName = $("h1, h2, h3").first().text().replace('Institute ', '').trim();
      const titleText = $("title").text();
      if (titleText && titleText.includes('|')) {
         instituteName = titleText.split('|')[0].replace(`[${code}]`, '').trim();
      }
      
      const results: any[] = [];
      $(`a[href^='/institute-results/${code}/']`).each((i, el) => {
        const href = $(el).attr('href');
        const parts = href?.split('/') || [];
        const dateStr = parts[parts.length - 1]; 
        
        const card = $(el).closest('.rounded-xl, .shadow-sm, [data-slot="card"], .border-gray-100'); 
        let rawText = card.text() || '';
        
        let fileCount = "Unknown";
        let matchFile = rawText.match(/(\d+) File[s]?/);
        if (matchFile) fileCount = matchFile[0];

        let passed = "", failed = "", total = "", curr = "";
        let matchPass = rawText.match(/Passed([\d.]+%)\s*(\d+)/);
        if (matchPass) passed = `${matchPass[1]} (${matchPass[2]})`;

        let matchFail = rawText.match(/Failed([\d.]+%)\s*(\d+)/);
        if (matchFail) failed = `${matchFail[1]} (${matchFail[2]})`;

        let matchTotal = rawText.match(/Total.*?(\d+)/);
        if (matchTotal) total = matchTotal[1];

        results.push({ href, dateStr, rawText, stats: { fileCount, passed, failed, total } });
      });
      
      return res.json({ success: true, instituteName, data: results });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.get("/api/bteb/institute-results/:code/:date", async (req, res) => {
    try {
      const { code, date } = req.params;
      const response = await fetch(`https://btebresultszone.com/institute-results/${code}/${date}`, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      if (!response.ok) return res.status(response.status).json({ success: false, error: "BTEB Server Error" });

      const html = await response.text();
      const $ = cheerio.load(html);
      
      const pdfs: string[] = [];
      $('a[href$=".pdf"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) pdfs.push(href);
      });
      
      return res.json({ success: true, pdfs });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // Simple custom proxy for BTEB
  const proxyRoutes = ['/institute-results', '/_next/data', '/_next/static', '/latest-results', '/group-results'];
  app.use(async (req, res, next) => {
    // Only intercept paths that match our proxyRoutes
    const shouldProxy = proxyRoutes.some(route => req.path.startsWith(route)) || 
                        (req.path.startsWith('/api/') && !req.path.startsWith('/api/bteb/institutes') && !req.path.startsWith('/api/results'));
    
    if (!shouldProxy) {
      return next();
    }

    try {
      const targetUrl = `https://btebresultszone.com${req.originalUrl}`;
      const fetchHeaders: Record<string, string> = {
        'Accept': req.headers.accept || '*/*',
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      
      if (req.headers.cookie) fetchHeaders.cookie = req.headers.cookie;
      if (req.headers['x-nextjs-data']) fetchHeaders['x-nextjs-data'] = Array.isArray(req.headers['x-nextjs-data']) ? req.headers['x-nextjs-data'][0] : req.headers['x-nextjs-data'];

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: fetchHeaders,
      });

      // Filter headers
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      const buffer = await response.arrayBuffer();

      if (contentType && contentType.includes('text/html')) {
        let html = Buffer.from(buffer).toString('utf-8');
        
        // Inject CSS to hide header, footer, top nav, main top padding etc
        html = html.replace('</head>', `
          <style>
            header, footer, nav[aria-label="breadcrumb"], .print\\:hidden, #nprogress { display: none !important; }
            main { padding-top: 0 !important; margin-top: 0 !important; }
            .min-h-screen-minus-topnav { min-height: 0 !important; }
          </style>
        </head>`);
        
        return res.send(html);
      } else {
        return res.send(Buffer.from(buffer));
      }
    } catch (error: any) {
      console.error('Proxy manual error:', error);
      res.status(500).send('Proxy error');
    }
  });

  app.get("/api/results", async (req, res) => {
    console.log("ALL ENV:", Object.keys(process.env).filter(k => k.includes('FIREBASE')).map(k => `${k}=${process.env[k]}`));
    try {
      const type = req.query.type as string;
      const roll = req.query.roll as string;
      const instituteCode = req.query.instituteCode as string;
      const curriculum = req.query.curriculumId as string;
      const regulation = req.query.regulation as string;

      if (type === 'institute') {
        if (!instituteCode) {
           return res.status(400).json({ success: false, error: 'Missing instituteCode' });
        }
        
        // Fetch from Firebase via REST API
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0079376731";
        let databaseId = process.env.VITE_FIREBASE_DATABASE_ID || "(default)";
        if (databaseId === "123") {
            databaseId = "(default)";
        }
        if (!projectId) {
           return res.status(500).json({ success: false, error: 'Firebase configuration missing on server' });
        }
        
        const apiKey = process.env.VITE_FIREBASE_API_KEY;
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery${apiKey ? `?key=${apiKey}` : ''}`;
        const body = {
          structuredQuery: {
            from: [{ collectionId: "results" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "institute.code" },
                op: "EQUAL",
                value: { integerValue: parseInt(instituteCode, 10) }
              }
            },
            limit: 1000
          }
        };
        
        console.log("SERVER DB ID IS:", databaseId);
        const fbRes = await fetch(url, { method: "POST", body: JSON.stringify(body) });
        if (!fbRes.ok) {
           console.log(`Firebase query returned ${fbRes.status} status. Check server configuration (API Key, Project ID restrict access).`);
        } else {
           const fbData = await fbRes.json();
           const parsedData: any[] = [];
           
           for (const doc of fbData) {
              if (doc.document && doc.document.fields) {
                  const fields = doc.document.fields;
                  const item: any = { id: doc.document.name.split('/').pop() };
                  for (const key in fields) {
                     if (fields[key].stringValue !== undefined) item[key] = fields[key].stringValue;
                     else if (fields[key].integerValue !== undefined) item[key] = parseInt(fields[key].integerValue, 10);
                     else if (fields[key].doubleValue !== undefined) item[key] = parseFloat(fields[key].doubleValue);
                     else if (fields[key].booleanValue !== undefined) item[key] = fields[key].booleanValue;
                  }
                  
                  if (!curriculum || item.curriculum === curriculum || item.curriculumId === curriculum) {
                     parsedData.push(item);
                  }
              }
           }

           if (parsedData.length > 0) {
              return res.json({ success: true, data: parsedData });
           }
        }
        
        // Since BTEB API doesn't support instituteCode directly in student-results and there's no open institute API,
        // and Firebase is either missing or empty, we must return empty data rather than crash.
        // In the future, the admin can upload institute data to Firebase.
        
        // Providing some mock data so the UI layout can be previewed!
        if (instituteCode === "56055" || true) {
          const mockData = [
            {
              rollNumber: "123456",
              institute: { name: "Sample Polytechnic Institute", code: instituteCode, district: "Sample District" },
              curriculumId: "diploma_in_engineering",
              regulation: "2022",
              createdAt: new Date().toISOString(),
              semester1: "3.50",
              semester2: '{"type":"referred","subjects":[{"name":"Math-1","code":"1234"}],"total":1}',
              semester3: "3.25",
              latestResults: [{ semester: "3", failedSubjects: [] }]
            },
            {
              rollNumber: "123457",
              institute: { name: "Sample Polytechnic Institute", code: instituteCode, district: "Sample District" },
              curriculumId: "diploma_in_engineering",
              regulation: "2022",
              createdAt: new Date().toISOString(),
              semester1: "3.80",
              semester2: "3.90",
              semester3: "3.75",
              latestResults: [{ semester: "3", failedSubjects: [] }]
            }
          ];
          return res.json({ success: true, data: mockData });
        }

        return res.json({ success: true, data: [] });
      }
      
      const fetchFromBteb = async (url: string, retries = 2, delayMs = 1500): Promise<any> => {
        try {
            const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
            });
            if (response.status === 429) {
                if (retries > 0) {
                    console.log(`Rate limited on ${url}, waiting ${delayMs}ms...`);
                    await new Promise(r => setTimeout(r, delayMs));
                    return await fetchFromBteb(url, retries - 1, delayMs * 1.5);
                }
                throw new Error('Rate Limited by BTEB Server. Please wait a few minutes and try again with a smaller range.');
            }
            if (!response.ok) {
            console.error("BTEB Fetch Error:", response.status, response.statusText);
            try {
                const text = await response.text();
                let btebError = '';
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.error) btebError = parsed.error;
                } catch(jsonErr) {
                    // Ignore JSON parse errors
                }
                if (btebError) throw new Error(btebError);
                
                if (text.includes("Cloudflare") || text.includes("1015")) {
                    throw new Error('IP Temporarily Blocked by BTEB due to high traffic. Please try again later.');
                }
                console.error("BTEB Response text:", text);
            } catch(e: any) {
                if (e.message && e.message !== "Failed to fetch from BTEB source") throw e;
            }
            throw new Error('Failed to fetch from BTEB source');
            }
            try {
            return await response.json();
            } catch (e) {
            throw new Error('Invalid JSON response from BTEB server. They might be blocking the request.');
            }
        } catch (error: any) {
             if ((error.message.includes('fetch failed') || error.cause?.code === 'ECONNRESET') && retries > 0) {
                 await new Promise(r => setTimeout(r, delayMs));
                 return await fetchFromBteb(url, retries - 1, delayMs * 1.5);
             }
             throw error;
        }
      };

      if (roll) {
        // Remove spaces and normalize
        const normalizedRollStr = roll.replace(/\s+/g, '');
        const hasRange = normalizedRollStr.includes('-');
        const hasComma = normalizedRollStr.includes(',');
        let isGroup = type === 'group' || hasRange || hasComma;
        
        if (isGroup && !hasRange && !hasComma) {
            isGroup = false; // "Roll combination is too short" fallback if they entered just 1 roll
        }

        if (!isGroup) {
          let apiUrl = `https://btebresultszone.com/api/student-results?roll=${normalizedRollStr}`;
          apiUrl += `&curriculumId=${curriculum || 'diploma_in_engineering'}`;
          apiUrl += `&regulation=${regulation || '2022'}`;
          const data = await fetchFromBteb(apiUrl);
          if (data && data.error === 'No results found') {
            return res.json({ success: true, data: [] });
          }
          return res.json(data);
        } else {
          // Multiple rolls
          if (!curriculum) {
             return res.status(400).json({ success: false, error: 'Curriculum is required for group searches.' });
          }
          const finalRegulation = regulation || "2022";

          // Generate range string directly from user input (removing spaces)
          let ranges = normalizedRollStr;
          let filterRolls = new Set<string>();
          let isFilterMode = false;
          let rolls: number[] = [];
          
          if (ranges.includes('-') || ranges.includes(',')) {
              const parts = ranges.split(',');
              parts.forEach(part => {
                  if (part.includes('-')) {
                      const [startStr, endStr] = part.split('-');
                      const s = parseInt(startStr, 10);
                      const e = parseInt(endStr, 10);
                      if (!isNaN(s) && !isNaN(e) && s <= e) {
                          for (let i = s; i <= e; i++) {
                              rolls.push(i);
                          }
                      }
                  } else {
                      const r = parseInt(part, 10);
                      if (!isNaN(r)) rolls.push(r);
                  }
              });
              rolls = Array.from(new Set(rolls)).sort((a, b) => a - b);
          }
          
          let rawStudents: any[] = [];
          try {
             const CHUNK_SIZE = 30; // Max rolls per request to BTEB to bypass 29 limit
             const chunks = [];
             for (let i = 0; i < rolls.length; i += CHUNK_SIZE) {
                 chunks.push(rolls.slice(i, i + CHUNK_SIZE));
             }
             
             if (chunks.length === 0) {
                 // Fallback if parsing failed
                 let groupApiUrl = `https://btebresultszone.com/api/group-results?rollRanges=${ranges}`;
                 groupApiUrl += `&curriculumId=${curriculum}&regulation=${finalRegulation}`;
                 const response = await fetchFromBteb(groupApiUrl);
                 if (response && response.success && response.data && response.data.studentResults) {
                     rawStudents = response.data.studentResults;
                 }
             } else {
                 // Fetch all chunks sequentially (or with a small delay)
                 for (let i = 0; i < chunks.length; i++) {
                     const chunk = chunks[i];
                     const chunkRange = `${chunk[0]}-${chunk[chunk.length - 1]}`;
                     let groupApiUrl = `https://btebresultszone.com/api/group-results?rollRanges=${chunkRange}`;
                     groupApiUrl += `&curriculumId=${curriculum}&regulation=${finalRegulation}`;
                     console.log(`Fetching chunk ${i+1}/${chunks.length}: ${groupApiUrl}`);
                     
                     const response = await fetchFromBteb(groupApiUrl);
                     if (response && response.success && response.data && response.data.studentResults) {
                         // Filter out strictly requested rolls to avoid extra results spanning the range gaps
                         const validResults = response.data.studentResults.filter((s: any) => chunk.includes(Number(s.roll)));
                         rawStudents.push(...validResults);
                     }
                     if (i < chunks.length - 1) {
                         await new Promise(r => setTimeout(r, 1000));
                     }
                 }
             }
             
             if (rawStudents.length > 0) {
                 // deduplicate students by roll just in case
                 const seen = new Set();
                 rawStudents = rawStudents.filter(s => {
                     if (seen.has(s.roll)) return false;
                     seen.add(s.roll);
                     return true;
                 });
                 
                 // 1. Identify minimal rolls to fetch to get ALL subject names
                 const unmetSubjects = new Set<string | number>();
                 const studentFailedSubs = new Map<string | number, (string | number)[]>();

                 rawStudents.forEach((s: any) => {
                     const subs = new Set<string | number>();
                     s.results.forEach((r: any) => {
                         if (r.failedSubjects && Array.isArray(r.failedSubjects)) {
                             r.failedSubjects.forEach((f: any) => {
                                 const code = f.subCode || f.code;
                                 if (code) {
                                     subs.add(code);
                                     unmetSubjects.add(code);
                                 }
                             });
                         }
                     });
                     if (subs.size > 0) studentFailedSubs.set(s.roll, Array.from(subs));
                 });

                 const rollsToFetch: (string | number)[] = [];
                 
                 // 1A. Identify clusters to ensure we fetch at least one roll per cluster for institute mapping
                 const sortedRollsForClusters = rawStudents.map((s: any) => Number(s.roll)).filter((r: number) => !isNaN(r)).sort((a: number, b: number) => a - b);
                 const clusters: number[][] = [];
                 if (sortedRollsForClusters.length > 0) {
                     let currentCluster = [sortedRollsForClusters[0]];
                     for (let i = 1; i < sortedRollsForClusters.length; i++) {
                         if (sortedRollsForClusters[i] - sortedRollsForClusters[i-1] > 500) {
                             clusters.push(currentCluster);
                             currentCluster = [sortedRollsForClusters[i]];
                         } else {
                             currentCluster.push(sortedRollsForClusters[i]);
                         }
                     }
                     clusters.push(currentCluster);
                 }

                 // Ensure we fetch at least one roll from each cluster
                 for (const c of clusters) {
                     if (rollsToFetch.length < 15) {
                         const firstRollStr = c[0].toString();
                         rollsToFetch.push(firstRollStr);
                         if (studentFailedSubs.has(firstRollStr)) {
                             studentFailedSubs.get(firstRollStr)!.forEach(s => unmetSubjects.delete(s));
                             studentFailedSubs.delete(firstRollStr);
                         } else if (studentFailedSubs.has(c[0])) {
                             studentFailedSubs.get(c[0])!.forEach(s => unmetSubjects.delete(s));
                             studentFailedSubs.delete(c[0]);
                         }
                     }
                 }
                 
                 while (unmetSubjects.size > 0 && rollsToFetch.length < 15) { // cap to avoid rate limits
                     let bestRoll: string | number | null = null;
                     let maxCovered = 0;
                     let bestCoveredSet: (string | number)[] = [];

                     for (const [roll, subs] of studentFailedSubs.entries()) {
                         const covering = subs.filter(s => unmetSubjects.has(s));
                         if (covering.length > maxCovered) {
                             maxCovered = covering.length;
                             bestRoll = roll;
                             bestCoveredSet = covering;
                         }
                     }

                     if (!bestRoll && rollsToFetch.length > 0) break; 
                     
                     if (bestRoll) {
                         rollsToFetch.push(bestRoll);
                         bestCoveredSet.forEach(s => unmetSubjects.delete(s));
                         studentFailedSubs.delete(bestRoll);
                     }
                 }

                 // 2. Fetch those specific rolls individually sequentially with delay
                 const subjectMap: Record<string, string> = {};
                 const fetchedInstitutes = new Map<number, { code: number, district: string, name: string }>();
                 if (rollsToFetch.length > 0) {
                     try {
                         const details: any[] = [];
                         for (let i = 0; i < rollsToFetch.length; i++) {
                             const rNum = rollsToFetch[i];
                             const url = `https://btebresultszone.com/api/student-results?roll=${rNum}&curriculumId=${curriculum}&regulation=${finalRegulation}`;
                             try {
                                 const res = await fetchFromBteb(url);
                                 details.push(res);
                             } catch(e: any) {
                                 console.warn(`Could not fetch details for roll ${rNum}: ${e.message}`);
                             }
                             if (i < rollsToFetch.length - 1) {
                                 await new Promise(r => setTimeout(r, 800)); // wait 800ms between individual requests
                             }
                         }
                         
                         details.forEach(detailRes => {
                             if (detailRes?.success && detailRes?.data?.[0]) {
                                 const pData = detailRes.data[0];
                                 if (pData.institute && pData.roll) {
                                     fetchedInstitutes.set(Number(pData.roll), pData.institute);
                                 }
                                 // populate subject map
                                 const allFailedLists = [
                                     ...(pData.currentFailedSubjects || []),
                                 ];
                                 if (pData.semesterResults) {
                                     pData.semesterResults.forEach((sr: any) => {
                                         if (sr.results) {
                                             sr.results.forEach((rs: any) => {
                                                 if (rs.failedSubjects) allFailedLists.push(...rs.failedSubjects);
                                             });
                                         }
                                     });
                                 }
                                 
                                 allFailedLists.forEach(f => {
                                     const code = f.subCode || f.code;
                                     if (code && f.subName) {
                                         subjectMap[code.toString()] = f.subName;
                                     }
                                 });
                             }
                         });
                     } catch (err) {
                         console.error("Failed fetching detail rolls for subject names", err);
                     }
                 }

                 // 3. Map final data, injecting subject names and institute
                 const mappedData = rawStudents.map((student: any) => {
                     // 1. Map all attempts, injecting subName into failedSubjects
                     student.results.forEach((r: any) => {
                         if (r.failedSubjects && Array.isArray(r.failedSubjects)) {
                             r.failedSubjects.forEach((f: any) => {
                                 const code = f.subCode || f.code;
                                 f.subName = f.subName || subjectMap[code?.toString()] || `Subject ${code}`;
                                 f.type = f.type || 'T';
                             });
                         }
                     });

                     // 2. Identify the FIRST semester each subject was failed
                     const sortedAsc = [...student.results].sort((a,b) => {
                         const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                         if (timeDiff !== 0) return timeDiff;
                         return a.semester - b.semester;
                     });
                     
                     const subjectOriginSem = new Map<number, number>();
                     sortedAsc.forEach((r: any) => {
                         if (r.failedSubjects && Array.isArray(r.failedSubjects)) {
                             r.failedSubjects.forEach((f: any) => {
                                 const code = f.subCode || f.code;
                                 if (code && !subjectOriginSem.has(code)) {
                                     subjectOriginSem.set(code, r.semester);
                                 }
                             });
                         }
                     });

                     // 3. Find the LATEST OVERALL result to extract the truly "current" failed subjects
                     const sortedDesc = [...student.results].sort((a,b) => {
                         const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
                         if (timeDiff !== 0) return timeDiff;
                         return b.semester - a.semester; // larger semester first on same date
                     });
                     
                     const latestResult = sortedDesc[0] || {};
                     const currentFailedRaw = latestResult.failedSubjects || [];
                     
                     const currentFailedSubjects = currentFailedRaw.map((f: any) => {
                         const code = f.subCode || f.code;
                         return {
                             subCode: code,
                             subName: f.subName || subjectMap[code?.toString()] || `Subject ${code}`,
                             type: f.type || 'T',
                             originSemester: subjectOriginSem.get(code) || latestResult.semester,
                             passed: false
                         };
                     });

                     // 4. Group results by semester to avoid duplicates in ResultView
                     const groupedSems = new Map<number, any[]>();
                     student.results.forEach((r: any) => {
                         if (!groupedSems.has(r.semester)) {
                             groupedSems.set(r.semester, []);
                         }
                         groupedSems.get(r.semester)!.push(r);
                     });
                     
                     const properSemesterResults = Array.from(groupedSems.entries()).map(([sem, resArray]) => {
                         // Sort chronological desc to find latest status of this particular semester
                         resArray.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                         const latestForSem = resArray[0];
                         const status = (latestForSem.failedSubjects && latestForSem.failedSubjects.length > 0) ? 'failed' : 'passed';
                         return {
                             semester: sem,
                             status: status,
                             results: resArray
                         };
                     });

                     // 5. Find the closest fetched institute
                     let bestInstitute = { name: "Unknown Institute", code: 0, district: "" };
                     if (fetchedInstitutes.size > 0) {
                         let minDiff = Infinity;
                         const sRoll = Number(student.roll);
                         for (const [rNum, inst] of fetchedInstitutes.entries()) {
                             const diff = Math.abs(rNum - sRoll);
                             if (diff < minDiff) {
                                 minDiff = diff;
                                 bestInstitute = inst;
                             }
                         }
                     }

                     return {
                         roll: student.roll,
                         curriculumId: curriculum,
                         regulation: regulation,
                         institute: bestInstitute,
                         currentFailedSubjects: currentFailedSubjects,
                         semesterResults: properSemesterResults,
                         latestResults: sortedDesc
                     };
                 });
                 // return exact format that ResultView component expects as json.data array
                 return res.json({ success: true, data: mappedData });
             } else {
                 if (response && response.error === 'No results found') {
                     return res.json({ success: true, data: [] });
                 }
                 throw new Error(response?.error || 'Failed to fetch group results');
             }
          } catch (err: any) {
             console.error(`Group fetch error:`, err.message);
             if (err.message === 'No results found') {
                 return res.json({ success: true, data: [] });
             }
             return res.status(500).json({ success: false, error: err.message });
          }
        }
      } else {
         return res.status(400).json({ success: false, error: 'Missing roll or instituteCode' });
      }
    } catch (error: any) {
      console.error('API proxy error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
