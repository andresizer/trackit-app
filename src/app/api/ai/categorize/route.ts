import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { suggestCategory } from "@/lib/ai/categorize"

const schema = z.object({
    workspaceId: z.string(),
    description: z.string()
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        const data = schema.parse(body)

        const result = await suggestCategory(data.workspaceId, data.description)

        return NextResponse.json({
            data: result,
            error: null,
        })
    } catch (error) {
        console.error("AI Categorize error:", error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid body", issues: error.issues },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        )
    }
}