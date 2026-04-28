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
      const roll = req.query.roll;
      const curriculum = req.query.curriculumId;
      const regulation = req.query.regulation;
      
      let apiUrl = `https://btebresultszone.com/api/student-results?roll=${roll}`;
      if (curriculum) apiUrl += `&curriculumId=${curriculum}`;
      if (regulation) apiUrl += `&regulation=${regulation}`;

      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: 'Failed to fetch from BTEB source' });
      }
      
      const data = await response.json();
      res.json(data);
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
