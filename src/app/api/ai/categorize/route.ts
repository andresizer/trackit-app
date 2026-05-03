import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db/prisma"
import { suggestCategory } from "@/lib/ai/categorize"

const schema = z.object({
    workspaceId: z.string(),
    description: z.string()
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        const data = schema.parse(body)

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