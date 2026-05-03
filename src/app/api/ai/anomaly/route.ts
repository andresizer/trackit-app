import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db/prisma"
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

        const session = await getServerSession()
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
        }

        const workspace = await prisma.workspace.findUnique({
            where: { id: data.workspaceId },
            include: { members: { where: { userId: session.user.id } } },
        })
        if (!workspace || workspace.members.length === 0) {
            return NextResponse.json({ error: "Acesso negado ao workspace" }, { status: 403 })
        }

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