import * as pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { readFile } from "fs/promises";
import OpenAI from "openai";
import { getRankBucket } from "./top-colleges";
import { prisma } from "@/lib/prisma";

interface ParsedActivity {
  title: string;
  description?: string;
  role?: string;
  organization?: string;
  hours?: number;
  years?: string;
}

interface ParsedEssay {
  topic: string;
  prompt?: string;
  summary?: string;
  tags?: string[];
}

interface ParsedResult {
  collegeName: string;
  decision: "admit" | "waitlist" | "deny";
  decisionRound?: "ED" | "EA" | "RD";
}

interface ParsedData {
  activities: ParsedActivity[];
  essays: ParsedEssay[];
  results: ParsedResult[];
  intendedMajor?: string;
  careerInterestTags?: string[];
}

/**
 * Extract text from uploaded file based on mime type
 */
async function extractText(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      const dataBuffer = await readFile(filePath);
      const data = await (pdfParse as any).default(dataBuffer);
      return data.text;
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimeType.startsWith("text/")) {
      return await readFile(filePath, "utf-8");
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error("[extractText] Error:", error);
    throw error;
  }
}

/**
 * Use OpenAI to parse structured data from raw text
 */
async function parseWithAI(rawText: string): Promise<ParsedData> {
  const apiKey = process.env.OPENAI_API_KEY;
  const aiEnabled = process.env.ALUMNI_AI_ENABLED === "true";

  if (!aiEnabled || !apiKey) {
    console.warn("[parseWithAI] AI parsing disabled or no API key");
    return {
      activities: [],
      essays: [],
      results: [],
    };
  }

  const openai = new OpenAI({ apiKey });

  const prompt = `You are an expert at parsing college admissions documents. Extract structured information from the following text.

Return a JSON object with this exact structure:
{
  "activities": [
    {
      "title": "Activity name",
      "description": "Brief description",
      "role": "Student's role/position",
      "organization": "Organization name",
      "hours": 100,
      "years": "9-12"
    }
  ],
  "essays": [
    {
      "topic": "Main topic/theme",
      "prompt": "Essay prompt if available",
      "summary": "Brief 1-2 sentence summary",
      "tags": ["tag1", "tag2"]
    }
  ],
  "results": [
    {
      "collegeName": "Full college name",
      "decision": "admit",
      "decisionRound": "ED"
    }
  ],
  "intendedMajor": "Major or field of study",
  "careerInterestTags": ["finance", "technology", "healthcare"]
}

Notes:
- For "decision", use only: "admit", "waitlist", or "deny"
- For "decisionRound", use only: "ED", "EA", or "RD" (or omit if unknown)
- Extract as much as you can find; if sections are missing, return empty arrays
- For careerInterestTags, infer from activities, essays, and stated interests

Document text:
${rawText.slice(0, 15000)}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that extracts structured data from college admissions documents. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content) as ParsedData;
    return parsed;
  } catch (error) {
    console.error("[parseWithAI] Error:", error);
    throw error;
  }
}

/**
 * Main parsing function: extract text, parse with AI, and persist to database
 */
export async function parseApplicationFile(
  applicationId: string,
  filePath: string,
  mimeType: string
): Promise<void> {
  try {
    // Extract text
    const rawText = await extractText(filePath, mimeType);

    // Update application with raw text
    await prisma.alumniApplication.update({
      where: { id: applicationId },
      data: { rawText },
    });

    // Parse with AI
    const parsedData = await parseWithAI(rawText);

    // Persist extracted data in a transaction
    await prisma.$transaction(async (tx) => {
      // Create activities
      if (parsedData.activities && parsedData.activities.length > 0) {
        await tx.extractedActivity.createMany({
          data: parsedData.activities.map((activity) => ({
            applicationId,
            title: activity.title,
            description: activity.description || null,
            role: activity.role || null,
            organization: activity.organization || null,
            hours: activity.hours || null,
            years: activity.years || null,
          })),
        });
      }

      // Create essays
      if (parsedData.essays && parsedData.essays.length > 0) {
        await tx.extractedEssay.createMany({
          data: parsedData.essays.map((essay) => ({
            applicationId,
            topic: essay.topic,
            prompt: essay.prompt || null,
            summary: essay.summary || null,
            tags: essay.tags ? JSON.stringify(essay.tags) : null,
          })),
        });
      }

      // Create admission results with rank bucketing
      if (parsedData.results && parsedData.results.length > 0) {
        await tx.admissionResult.createMany({
          data: parsedData.results.map((result) => ({
            applicationId,
            collegeName: result.collegeName,
            decision: result.decision,
            decisionRound: result.decisionRound || null,
            rankBucket: getRankBucket(result.collegeName),
          })),
        });
      }

      // Update alumni profile with major and tags if provided
      const application = await tx.alumniApplication.findUnique({
        where: { id: applicationId },
        include: { alumniProfile: true },
      });

      if (application && (parsedData.intendedMajor || parsedData.careerInterestTags)) {
        await tx.alumniProfile.update({
          where: { id: application.alumniId },
          data: {
            intendedMajor: parsedData.intendedMajor || application.alumniProfile.intendedMajor,
            careerInterestTags: parsedData.careerInterestTags
              ? JSON.stringify(parsedData.careerInterestTags)
              : application.alumniProfile.careerInterestTags,
          },
        });
      }

      // Mark parse as successful
      await tx.alumniApplication.update({
        where: { id: applicationId },
        data: {
          parseStatus: "success",
          parseError: null,
        },
      });
    });

    console.log(`[parseApplicationFile] Successfully parsed application ${applicationId}`);
  } catch (error) {
    console.error(`[parseApplicationFile] Error parsing application ${applicationId}:`, error);

    // Mark parse as failed
    await prisma.alumniApplication.update({
      where: { id: applicationId },
      data: {
        parseStatus: "failed",
        parseError: error instanceof Error ? error.message : "Unknown error",
      },
    });

    throw error;
  }
}

