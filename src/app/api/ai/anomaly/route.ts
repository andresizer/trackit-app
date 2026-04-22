import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { detectAnomalies } from "@/lib/ai/anomaly"

const schema = z.object({
    workspaceId: z.string()
})

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)

        const raw = {
            workspaceId: searchParams.get("workspaceId")
        }

        const data = schema.parse(raw)

        const result = await detectAnomalies(data.workspaceId)

        return NextResponse.json({
            data: result,
            error: null,
        })
    } catch (error) {
        console.error("AI Anomaly error:", error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid params", issues: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        )
    }
}