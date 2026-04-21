/**
 * Script de migração dos dados históricos do Excel → PostgreSQL
 *
 * Este script lê o arquivo Excel legado (12 abas mensais) e importa
 * as transações para o banco de dados, mapeando os códigos legados
 * (CC, DIN, A1, M7, etc.) para os IDs das categorias e contas no novo sistema.
 *
 * USO:
 *   npx tsx scripts/migrate-excel.ts --file ./dados.xlsx --workspace <workspaceId>
 *
 * DEPENDÊNCIAS (instalar antes de usar):
 *   npm install xlsx
 *
 * IMPORTANTE:
 *   - Execute o seed antes para criar categorias e contas padrão
 *   - Rode em modo dry-run primeiro para verificar os dados
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapeamento dos códigos legados do VBA para os nomes no novo sistema
const LEGACY_ACCOUNT_MAP: Record<string, string> = {
  CC: 'Conta Corrente',
  DIN: 'Dinheiro',
  CRE: 'Cartão de Crédito',
  VA: 'Vale Alimentação',
  VR: 'Vale Refeição',
  INV: 'Investimentos',
  POUP: 'Poupança',
}

// Os meses das abas do Excel (plan01–plan12)
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

interface ExcelRow {
  data: string | Date
  descricao: string
  valor: number
  tipo: string // Código legado da conta (CC, DIN, etc.)
  categoria: string // Código legado da categoria (A1, M7, etc.)
  formaPagamento?: string
}

async function buildLegacyMaps(workspaceId: string) {
  // Mapear legacyCode → id para contas
  const accounts = await prisma.bankAccount.findMany({
    where: { workspaceId },
  })
  const accountMap = new Map<string, string>()
  for (const acc of accounts) {
    if (acc.legacyCode) accountMap.set(acc.legacyCode, acc.id)
  }

  // Mapear legacyCode → id para categorias
  const categories = await prisma.category.findMany({
    where: { workspaceId },
  })
  const categoryMap = new Map<string, string>()
  for (const cat of categories) {
    if (cat.legacyCode) categoryMap.set(cat.legacyCode, cat.id)
  }

  // Mapear formas de pagamento
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { workspaceId },
  })
  const pmMap = new Map<string, string>()
  for (const pm of paymentMethods) {
    pmMap.set(pm.name.toLowerCase(), pm.id)
  }

  return { accountMap, categoryMap, pmMap }
}

async function migrateRow(
  workspaceId: string,
  row: ExcelRow,
  maps: Awaited<ReturnType<typeof buildLegacyMaps>>,
  dryRun: boolean
) {
  const { accountMap, categoryMap } = maps

  const accountId = accountMap.get(row.tipo)
  if (!accountId) {
    console.warn(`⚠️  Conta não encontrada para código: ${row.tipo}`)
    return null
  }

  const categoryId = categoryMap.get(row.categoria) ?? null

  const date = row.data instanceof Date ? row.data : new Date(row.data)
  const isIncome = row.valor > 0
  const amount = Math.abs(row.valor)

  const data = {
    workspaceId,
    type: isIncome ? 'INCOME' as const : 'EXPENSE' as const,
    amount,
    description: row.descricao,
    date,
    bankAccountId: accountId,
    categoryId,
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] ${date.toISOString().split('T')[0]} | ${row.descricao} | R$ ${amount.toFixed(2)} | ${row.tipo} → ${row.categoria}`)
    return data
  }

  return prisma.transaction.create({ data })
}

async function main() {
  const args = process.argv.slice(2)
  const fileIndex = args.indexOf('--file')
  const wsIndex = args.indexOf('--workspace')
  const dryRun = args.includes('--dry-run')

  if (fileIndex === -1 || wsIndex === -1) {
    console.log('USO: npx tsx scripts/migrate-excel.ts --file ./dados.xlsx --workspace <workspaceId> [--dry-run]')
    process.exit(1)
  }

  const filePath = args[fileIndex + 1]
  const workspaceId = args[wsIndex + 1]

  console.log(`📊 Migrando dados de: ${filePath}`)
  console.log(`🏢 Workspace: ${workspaceId}`)
  if (dryRun) console.log('🔍 Modo DRY-RUN (nenhum dado será salvo)')

  // Verificar que o workspace existe
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })

  if (!workspace) {
    console.error('❌ Workspace não encontrado')
    process.exit(1)
  }

  // Construir mapeamentos
  const maps = await buildLegacyMaps(workspaceId)
  console.log(`📋 Contas mapeadas: ${maps.accountMap.size}`)
  console.log(`📋 Categorias mapeadas: ${maps.categoryMap.size}`)

  // TODO: Ler o arquivo Excel e iterar pelas abas/linhas
  // Aqui usaria a lib 'xlsx' para parsear o arquivo:
  //
  // import * as XLSX from 'xlsx'
  // const workbook = XLSX.readFile(filePath)
  //
  // for (const sheetName of workbook.SheetNames) {
  //   const sheet = workbook.Sheets[sheetName]
  //   const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet)
  //   for (const row of rows) {
  //     await migrateRow(workspaceId, row, maps, dryRun)
  //   }
  // }

  console.log('\n⚠️  Script de migração em modo esqueleto.')
  console.log('   Para ativar, instale `xlsx` e descomente a lógica de leitura acima.')
  console.log('   Adapte os nomes das colunas do seu Excel para o formato ExcelRow.')
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
