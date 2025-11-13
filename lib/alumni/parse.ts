import mammoth from "mammoth";
import { readFile } from "fs/promises";
import OpenAI from "openai";
import { getRankBucket } from "./top-colleges";
import { prisma } from "@/lib/prisma";
import { upsertEmbedding } from "@/lib/retrieval/indexer";

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

interface ParsedAward {
  title: string;
  level?: string;
  year?: string;
  description?: string;
}

interface ParsedData {
  activities: ParsedActivity[];
  essays: ParsedEssay[];
  results: ParsedResult[];
  awards: ParsedAward[];
  intendedMajor?: string;
  careerInterestTags?: string[];
}

/**
 * Extract text from uploaded file based on mime type
 */
async function extractText(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      // PDF parsing is complex in Next.js server environment
      // Recommend converting to TXT or DOCX for now
      throw new Error(
        "PDF parsing requires additional setup. Please convert your PDF to TXT or DOCX format. " +
        "You can do this by opening the PDF and using 'Save As' → 'Plain Text' or 'Word Document'."
      );
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
      awards: [],
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
  "awards": [
    {
      "title": "Award name",
      "level": "national",
      "year": "2023",
      "description": "Brief description"
    }
  ],
  "intendedMajor": "Major or field of study",
  "careerInterestTags": ["finance", "technology", "healthcare"]
}

Notes:
- For "decision", use only: "admit", "waitlist", or "deny"
- For "decisionRound", use only: "ED", "EA", or "RD" (or omit if unknown)
- For "level", use: "national", "state", "regional", or "school" (or omit if unknown)
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
 * Index all alumni data for semantic search after successful parse
 */
async function indexAlumniData(applicationId: string): Promise<void> {
  console.log(`[indexAlumniData] Starting indexing for application ${applicationId}`);

  // Index the application itself (rawText)
  await upsertEmbedding("AlumniApplication", applicationId);

  // Get all related records
  const [activities, essays, awards, results] = await Promise.all([
    prisma.extractedActivity.findMany({ where: { applicationId } }),
    prisma.extractedEssay.findMany({ where: { applicationId } }),
    prisma.extractedAward.findMany({ where: { applicationId } }),
    prisma.admissionResult.findMany({ where: { applicationId } }),
  ]);

  // Index all extracted activities
  for (const activity of activities) {
    await upsertEmbedding("ExtractedActivity", activity.id);
  }

  // Index all extracted essays
  for (const essay of essays) {
    await upsertEmbedding("ExtractedEssay", essay.id);
  }

  // Index all extracted awards
  for (const award of awards) {
    await upsertEmbedding("ExtractedAward", award.id);
  }

  // Index all admission results
  for (const result of results) {
    await upsertEmbedding("AdmissionResult", result.id);
  }

  console.log(
    `[indexAlumniData] Indexed ${activities.length} activities, ${essays.length} essays, ` +
    `${awards.length} awards, ${results.length} results for application ${applicationId}`
  );
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

      // Create awards
      if (parsedData.awards && parsedData.awards.length > 0) {
        await tx.extractedAward.createMany({
          data: parsedData.awards.map((award) => ({
            applicationId,
            title: award.title,
            level: award.level || null,
            year: award.year || null,
            description: award.description || null,
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

    // Index all created records for semantic search (async, don't block)
    indexAlumniData(applicationId).catch((error) => {
      console.error(`[parseApplicationFile] Failed to index alumni data for ${applicationId}:`, error);
    });
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

