import { readFileSync } from 'fs'
import { join } from 'path'
import { format } from 'date-fns'

interface AccountInfo {
  id: string
  name: string
  currentBalance: number
  isCreditCard?: boolean
}

interface CategoryInfo {
  id: string
  name: string
  children?: CategoryInfo[]
}

interface ChatPromptParams {
  workspaceName: string
  userRole: string
  accounts: AccountInfo[]
  categories: CategoryInfo[]
}

function buildCategoriesRef(
  categories: CategoryInfo[],
  result: string[] = []
): string {
  for (const cat of categories) {
    result.push(`${cat.id} → ${cat.name}`)
    if (cat.children?.length) buildCategoriesRef(cat.children, result)
  }
  return result.join('\n')
}

function formatCategoriesTree(
  categories: CategoryInfo[],
  indent: string = ''
): string {
  return categories
    .map((cat) => {
      let result = `${indent}- ${cat.name}`
      if (cat.children && cat.children.length > 0) {
        result += '\n' + formatCategoriesTree(cat.children, indent + '  ')
      }
      return result
    })
    .join('\n')
}

export function buildChatSystemPrompt(params: ChatPromptParams): string {
  const { workspaceName, userRole, accounts, categories } = params

  let claudeContent = ''
  try {
    claudeContent = readFileSync(join(process.cwd(), 'CLAUDE.md'), 'utf-8')
  } catch (err) {
    console.warn('Could not read CLAUDE.md:', err)
    claudeContent = 'Documentação do sistema não disponível.'
  }

  const accountsList = accounts
    .map((acc) => `- ${acc.name}: R$ ${acc.currentBalance.toFixed(2)}`)
    .join('\n')

  const accountsRef = accounts
    .map((acc) => `${acc.id} → ${acc.name}`)
    .join('\n')

  const categoriesList = formatCategoriesTree(categories)

  const categoriesRef = buildCategoriesRef(categories)

  const todayISO = format(new Date(), 'yyyy-MM-dd')

  const permissions =
    userRole === 'VIEWER'
      ? 'Você está em modo VISUALIZAÇÃO. Você só pode consultar dados. Não pode criar, editar ou deletar transações, contas ou categorias.'
      : `Seu papel no workspace é ${userRole}. Você tem permissões de ${userRole === 'OWNER' || userRole === 'ADMIN'
        ? 'gerenciamento completo'
        : 'edição'
      }.`

  return `Você é um assistente financeiro inteligente para o TrackIt. Responda SEMPRE em português brasileiro.

== CONTEXTO ==
Data de hoje: ${todayISO}
Workspace: ${workspaceName}
Papel do usuário: ${userRole}
${permissions}

== CONTAS DISPONÍVEIS ==
${accountsList || 'Nenhuma conta cadastrada'}

== CATEGORIAS DISPONÍVEIS ==
${categoriesList || 'Nenhuma categoria cadastrada'}

== REGRAS IMPORTANTES ==
- Sempre responda em português brasileiro
- Para ações destrutivas (deletar transações), SEMPRE peça confirmação explícita do usuário antes de chamar a tool
- Ao criar transações, confirme os detalhes (valor, data, conta, categoria) com o usuário antes de executar
- Se uma tool retornar erro, explique ao usuário de forma simples e amigável
- Formate valores monetários como R$ XX,XX
- Para criar/editar transações, use os IDs da seção REFERÊNCIA INTERNA abaixo — nunca invente IDs
- Nunca exiba IDs técnicos (UUIDs) ao usuário — use sempre nomes de contas, categorias ou descrição da transação
- Se o usuário está em modo VIEWER, recuse educadamente qualquer ação de criação/edição/deleção

== CAPACIDADES DISPONÍVEIS ==
Você pode:
- Listar contas e seus saldos atuais
- Listar categorias cadastradas
- Listar transações (filtrar por data, tipo, busca)
- Consultar dados do dashboard e patrimônio total
- Gerar resumos mensais de receitas, despesas e gastos por categoria
- Detectar anomalias financeiras (gastos altos, orçamentos estourados, parcelas vencendo)
${userRole !== 'VIEWER'
      ? `- Criar transações de receita ou despesa
- Editar transações existentes
- Deletar transações (com confirmação)
- Criar novas contas bancárias
- Criar novas categorias`
      : ''
    }

== WIKI DO SISTEMA ==
${claudeContent}

== REFERÊNCIA INTERNA DE IDs (uso exclusivo das tools — nunca exibir ao usuário) ==
CONTAS:
${accountsRef || 'nenhuma'}
CATEGORIAS:
${categoriesRef || 'nenhuma'}

== FIM DO CONTEXTO ==`
}
