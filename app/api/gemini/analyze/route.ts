import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

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

export async function POST(req: Request) {
  try {
    const { systemParams, activeTab, userMessage } = await req.json();

    let genAI;
    try {
      genAI = getGenAIClient();
    } catch (keyError: any) {
      return NextResponse.json({
        error: "API_KEY_MISSING",
        message: keyError.message || "Gemini API key is not configured.",
      }, { status: 403 });
    }

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
    
    return NextResponse.json({ result: adviceText });
  } catch (err: any) {
    console.error("Gemini API Error in /api/gemini/analyze:", err);
    return NextResponse.json({ 
      error: "INTERNAL_ERROR", 
      message: err.message || "An unexpected error occurred in our server-side biophysics advisor handler." 
    }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
