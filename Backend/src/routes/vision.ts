import { Hono } from "hono";
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { log } from "../lib/logger.js";

const vision = new Hono();

// Uses process.env.GEMINI_API_KEY by default
const ai = new GoogleGenAI({});

const documentAnalysisJsonSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["id-document", "matric-transcript", "proof-of-address", "motivational-letter", "other"],
      description: "The categorized type of the document."
    },
    extractedData: {
      type: "object",
      properties: {
        name: { type: "string", description: "Full name found on the document." },
        idNumber: { type: "string", description: "South African ID number found on the document." },
        subjects: {
          type: "array",
          description: "List of academic subjects and percentages, typically found on matric transcripts.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Subject name" },
              percentage: { type: "number", description: "Percentage score (0-100)" }
            },
            required: ["name", "percentage"]
          }
        }
      }
    },
    qualityIssues: {
      type: "array",
      description: "List of quality issues with the scan (e.g. 'blurry', 'glare', 'cut off', 'too dark'). Empty if the image is clear and fully legible.",
      items: { type: "string" }
    },
    isCertified: {
      type: "boolean",
      description: "Whether a certification stamp (e.g., from South African Police Service or a Commissioner of Oaths) is visible on the document."
    },
    certificationValid: {
      type: "boolean",
      description: "Whether the certification stamp is dated within the last 3 months. False if no stamp, no date, or date is older than 3 months."
    }
  },
  required: ["category", "extractedData", "qualityIssues", "isCertified", "certificationValid"]
};

const documentAnalysisSchema = z.object({
  category: z.enum(["id-document", "matric-transcript", "proof-of-address", "motivational-letter", "other"]),
  extractedData: z.object({
    name: z.string().optional(),
    idNumber: z.string().optional(),
    subjects: z.array(z.object({
      name: z.string(),
      percentage: z.number()
    })).optional()
  }).optional(),
  qualityIssues: z.array(z.string()),
  isCertified: z.boolean(),
  certificationValid: z.boolean()
});

vision.post("/analyze", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"] as File | string | undefined;

    if (!file || typeof file === "string") {
      return c.json({ error: "No valid file provided in 'file' field" }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = `
      You are an expert document analyzer for a South African university application platform.
      Analyze the provided document image and extract the requested information.
      Pay special attention to the quality of the scan and the presence of a valid certification stamp (date within the last 3 months).
      Assume the current date is ${new Date().toISOString().split("T")[0]}.
    `;

    const interaction = await ai.interactions.create({
      model: "gemini-2.5-flash",
      input: [
        { type: "text", text: prompt },
        { type: "image", data: base64Image, mime_type: mimeType }
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: documentAnalysisJsonSchema
      }
    });

    const resultText = interaction.output_text;
    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    // Parse to ensure runtime safety
    const result = documentAnalysisSchema.parse(JSON.parse(resultText));

    return c.json(result);
  } catch (error: any) {
    log.error("Vision Analysis Error", error);
    return c.json({ error: error.message || "Failed to analyze document" }, 500);
  }
});

export default vision;
