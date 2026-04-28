import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API to fetch results from BTEB Results Zone
  app.get("/api/results", async (req, res) => {
    try {
      const type = req.query.type as string;
      const roll = req.query.roll as string;
      const instituteCode = req.query.instituteCode as string;
      const curriculum = req.query.curriculumId as string;
      const regulation = req.query.regulation as string;
      
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
          return res.json(data);
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
          
          return res.json({ success: true, data: combinedData });
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

startServer();
