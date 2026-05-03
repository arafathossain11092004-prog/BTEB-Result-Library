import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from "@google/genai";

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

  app.post("/api/admin/extract-pdf", async (req, res) => {
    try {
      const { chunkText } = req.body;
      if (!chunkText) return res.status(400).json({ success: false, error: "Missing chunkText" });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const promptString = `You are a highly advanced AI system specialized in extracting and structuring technical education board result data from large, messy PDF documents.

Your task is to process the ENTIRE provided text and convert it into a clean, structured, database-ready JSON.

========================================
🎯 PRIMARY GOAL
========================================
Transform unstructured result PDF text into structured JSON with:
- Institute Info (code, name)
- Exam Info
- Student-wise result
- Subject mapping

NO explanation. ONLY JSON output.

========================================
📌 STEP 1: DETECT INSTITUTE
========================================
Extract for each institute block:
- Institute Name
- Institute Code

========================================
📌 STEP 2: EXTRACT EXAM INFO
========================================
From header text extract:
- Regulation (e.g., 2022 Regulation)
- Curriculum (e.g., Diploma in Engineering)
- Semester (e.g., 3rd Semester)
- Exam Year

========================================
📌 STEP 3: STUDENT DATA EXTRACTION
========================================
For EACH roll number:
Extract:
- Roll Number
- GPA (gpa1, gpa2, gpa3)
- Result Status ("Pass", "Referred", "Fail")
- Referred Subjects (ref_sub)
- Failed Subjects

========================================
📌 STEP 4: SUBJECT PROCESSING
========================================
For each subject:
Extract: Subject Code, Subject Type (T/P).
Mark subject status: "referred" or "failed"

========================================
📌 STEP 5: OUTPUT FORMAT (STRICT JSON)
========================================
Return ONLY this format. Output NO markdown formatting around JSON:

{
  "institutes": [
    {
      "name": "",
      "code": "",
      "exam": {
        "regulation": "",
        "curriculum": "",
        "semester": "",
        "year": ""
      },
      "students": [
        {
          "roll": "",
          "gpa": { "gpa1": "", "gpa2": "", "gpa3": "" },
          "status": "",
          "subjects": [
            { "code": "", "name": "", "type": "", "status": "" }
          ]
        }
      ]
    }
  ]
}

========================================
Data to process:
${chunkText}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: promptString,
        config: {
          responseMimeType: "application/json",
        }
      });

      return res.json({ success: true, text: response.text });
    } catch (error: any) {
      console.error("Extraction error:", error);
      res.status(error?.status || 500).json({ success: false, error: JSON.stringify(error) });
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
