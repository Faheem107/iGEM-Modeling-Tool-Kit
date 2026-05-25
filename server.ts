import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing
  app.use(express.json());

  // Safe lazy-initialization of Gemini SDK to prevent server crashes if the key is missing in developer environments
  let aiClient: GoogleGenAI | null = null;
  function getGenAIClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in Settings > Secrets.");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // API endpoint for dry-lab AI Advisor analysis
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { systemParams, activeTab, userMessage } = req.body;

      let genAI;
      try {
        genAI = getGenAIClient();
      } catch (keyError: any) {
        return res.status(403).json({
          error: "API_KEY_MISSING",
          message: keyError.message || "Gemini API key is not configured.",
        });
      }

      // Generate a detailed background context payload based on current simulation configuration
      const contextPrompt = `
        You are the official Dry Lab iGEM Advisor & Biophysicist for the NYUAD 2026 iGEM team.
        Their project focuses on "Stabilizing dry Sand using Bacteria-produced Biopolymers" via genetic engineering.
        Specifically, overexpressing poly-gamma-glutamic acid (gamma-PGA) in Bacillus subtilis biofilms to mitigate dust storms and desert sand erosion.

        We are currently in the simulation sandbox called: "${activeTab || 'General Sandbox'}".
        Current parameters of the active modeling approach:
        ${JSON.stringify(systemParams, null, 2)}

        The user has asked the following:
        "${userMessage}"

        Please provide an exceptionally knowledgeable, professional, and practical dry-lab biophysics review.
        Structure your advice into concrete suggestions for their wet-lab laboratory assays (e.g., cell yields, shear assays, wind-tunnel threshold calibration, or residue docking validations).
        Be highly helpful, motivating, and keep the tone academic yet encouraging. Avoid clinical or dense developer jargon, and avoid referencing React, JSON parameters or site code files. Focus on biology!
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextPrompt,
        config: {
          systemInstruction: "You are an expert iGEM Dry Lab Advisor, deeply knowledgeable in synthetic biology, ordinary differential equations, rubber elasticity polymer physics, aeolian geophysics, and molecular dynamics docking optimizations."
        }
      });

      const adviceText = response.text || "I was unable to analyze this simulation state. Please tweak parameters and try again.";
      
      return res.json({ result: adviceText });
    } catch (err: any) {
      console.error("Gemini API Error in /api/gemini/analyze:", err);
      return res.status(500).json({ 
        error: "INTERNAL_ERROR", 
        message: err.message || "An unexpected error occurred in our server-side biophysics advisor handler." 
      });
    }
  });

  // Serve static assets or mount Vite dev server based on container environment mode
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite hot middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static client assets from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NYUAD iGEM 2026 server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server process:", err);
});
