import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    const prompt = `
      You are an expert at parsing job descriptions for video editors. 
      Extract the following information from the given raw client message.
      Return ONLY a JSON object (no markdown, no backticks, no text).
      Ensure it strictly matches this schema:
      {
        "title": "A short engaging title for the lead",
        "description": "A polished version of the description",
        "budgetNumeric": (number),
        "budgetString": (string, e.g. "$500 total"),
        "platform": "YouTube" | "Instagram" | "TikTok" | "Podcast" | "Corporate" | "Other",
        "category": "Shorts" | "Long Form" | "Vlog" | "Documentary" | "Commercial" | "Other",
        "softwareRequired": ["array", "of", "software", "names"],
        "leadType": "HOT" | "FEATURED" | "FREE" | "PRO",
        "accessType": "FREE" | "PRO"
      }

      Raw message:
      "${message}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanedText);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Gemini error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
