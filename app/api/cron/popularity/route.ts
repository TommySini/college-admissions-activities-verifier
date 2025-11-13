import { NextRequest, NextResponse } from "next/server";
import { recomputePopularity } from "@/lib/cron/popularity";

// This endpoint can be called by Vercel Cron or similar
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const result = await recomputePopularity();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Failed to recompute popularity" },
      { status: 500 }
    );
  }
}

