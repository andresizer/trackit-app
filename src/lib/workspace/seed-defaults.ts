import { prisma } from '@/lib/db/prisma'
import { AccountType, PaymentMethodType } from '@prisma/client'

// ============================================================
// Categorias padrão — espelho do seed.ts
// ============================================================
const DEFAULT_CATEGORIES = [
  {
    name: 'Alimentação', icon: '🍽️', color: '#f59e0b', legacyCode: 'A',
    children: [
      { name: 'Supermercado', icon: '🛒', legacyCode: 'A1' },
      { name: 'Refeição fora', icon: '🍔', legacyCode: 'A2' },
      { name: 'Delivery', icon: '📦', legacyCode: 'A3' },
      { name: 'Padaria', icon: '🥖', legacyCode: 'A4' },
      { name: 'Lanches', icon: '🥪', legacyCode: 'A5' },
    ],
  },
  {
    name: 'Moradia', icon: '🏠', color: '#6366f1', legacyCode: 'M',
    children: [
      { name: 'Aluguel', icon: '🔑', legacyCode: 'M1' },
      { name: 'Condomínio', icon: '🏢', legacyCode: 'M2' },
      { name: 'Energia', icon: '⚡', legacyCode: 'M3' },
      { name: 'Água', icon: '💧', legacyCode: 'M4' },
      { name: 'Gás', icon: '🔥', legacyCode: 'M5' },
      { name: 'Internet', icon: '🌐', legacyCode: 'M6' },
      { name: 'Manutenção', icon: '🔧', legacyCode: 'M7' },
    ],
  },
  {
    name: 'Transporte', icon: '🚗', color: '#3b82f6', legacyCode: 'T',
    children: [
      { name: 'Combustível', icon: '⛽', legacyCode: 'T1' },
      { name: 'Estacionamento', icon: '🅿️', legacyCode: 'T2' },
      { name: 'Pedágio', icon: '🛣️', legacyCode: 'T3' },
      { name: 'Transporte público', icon: '🚌', legacyCode: 'T4' },
      { name: 'Uber/99', icon: '🚕', legacyCode: 'T5' },
      { name: 'Manutenção veículo', icon: '🔧', legacyCode: 'T6' },
      { name: 'Seguro veículo', icon: '🛡️', legacyCode: 'T7' },
    ],
  },
  {
    name: 'Saúde', icon: '🏥', color: '#ef4444', legacyCode: 'S',
    children: [
      { name: 'Plano de saúde', icon: '🏥', legacyCode: 'S1' },
      { name: 'Farmácia', icon: '💊', legacyCode: 'S2' },
      { name: 'Consulta médica', icon: '👨‍⚕️', legacyCode: 'S3' },
      { name: 'Dentista', icon: '🦷', legacyCode: 'S4' },
      { name: 'Academia', icon: '🏋️', legacyCode: 'S5' },
    ],
  },
  {
    name: 'Educação', icon: '📚', color: '#8b5cf6', legacyCode: 'E',
    children: [
      { name: 'Faculdade', icon: '🎓', legacyCode: 'E1' },
      { name: 'Cursos', icon: '📖', legacyCode: 'E2' },
      { name: 'Livros', icon: '📕', legacyCode: 'E3' },
      { name: 'Material escolar', icon: '✏️', legacyCode: 'E4' },
    ],
  },
  {
    name: 'Lazer', icon: '🎮', color: '#ec4899', legacyCode: 'L',
    children: [
      { name: 'Streaming', icon: '📺', legacyCode: 'L1' },
      { name: 'Cinema/Teatro', icon: '🎬', legacyCode: 'L2' },
      { name: 'Viagem', icon: '✈️', legacyCode: 'L3' },
      { name: 'Jogos', icon: '🎮', legacyCode: 'L4' },
      { name: 'Restaurantes', icon: '🍷', legacyCode: 'L5' },
      { name: 'Hobbies', icon: '🎨', legacyCode: 'L6' },
    ],
  },
  {
    name: 'Vestuário', icon: '👔', color: '#14b8a6', legacyCode: 'V',
    children: [
      { name: 'Roupas', icon: '👕', legacyCode: 'V1' },
      { name: 'Calçados', icon: '👟', legacyCode: 'V2' },
      { name: 'Acessórios', icon: '👜', legacyCode: 'V3' },
    ],
  },
  {
    name: 'Pessoal', icon: '👤', color: '#f97316', legacyCode: 'P',
    children: [
      { name: 'Higiene', icon: '🧴', legacyCode: 'P1' },
      { name: 'Cabeleireiro', icon: '💇', legacyCode: 'P2' },
      { name: 'Presentes', icon: '🎁', legacyCode: 'P3' },
      { name: 'Assinaturas', icon: '📋', legacyCode: 'P4' },
    ],
  },
  {
    name: 'Financeiro', icon: '💰', color: '#22c55e', legacyCode: 'F',
    children: [
      { name: 'Investimento', icon: '📈', legacyCode: 'F1' },
      { name: 'Poupança', icon: '🏦', legacyCode: 'F2' },
      { name: 'Empréstimo', icon: '🏧', legacyCode: 'F3' },
      { name: 'Taxas bancárias', icon: '🏦', legacyCode: 'F4' },
      { name: 'Impostos', icon: '📝', legacyCode: 'F5' },
      { name: 'Seguros', icon: '🛡️', legacyCode: 'F6' },
      { name: 'Pagamento de fatura', icon: '💳', legacyCode: 'F7' },
    ],
  },
  {
    name: 'Receitas', icon: '💵', color: '#10b981', legacyCode: 'R',
    children: [
      { name: 'Salário', icon: '💰', legacyCode: 'R1' },
      { name: 'Freelance', icon: '💻', legacyCode: 'R2' },
      { name: 'Rendimentos', icon: '📊', legacyCode: 'R3' },
      { name: 'Venda de bens', icon: '🏷️', legacyCode: 'R4' },
      { name: 'Bonificação', icon: '🎉', legacyCode: 'R5' },
      { name: 'Restituição', icon: '🔄', legacyCode: 'R6' },
      { name: 'Outros recebimentos', icon: '💵', legacyCode: 'R7' },
      { name: 'Resgate investimento', icon: '📈', legacyCode: 'R8' },
    ],
  },
  {
    name: 'Outros', icon: '📌', color: '#64748b', legacyCode: 'O',
    children: [
      { name: 'Diversos', icon: '📦', legacyCode: 'O1' },
      { name: 'Doações', icon: '❤️', legacyCode: 'O2' },
    ],
  },
]

const DEFAULT_ACCOUNTS = [
  { name: 'Conta Corrente', type: AccountType.CHECKING, legacyCode: 'CC', color: '#6366f1', icon: '🏦' },
  { name: 'Dinheiro', type: AccountType.CASH, legacyCode: 'DIN', color: '#22c55e', icon: '💵' },
  { name: 'Cartão de Crédito', type: AccountType.CREDIT_CARD, legacyCode: 'CRE', color: '#ef4444', icon: '💳' },
  { name: 'Vale Alimentação', type: AccountType.FOOD_VOUCHER, legacyCode: 'VA', color: '#f59e0b', icon: '🍽️' },
  { name: 'Vale Refeição', type: AccountType.MEAL_VOUCHER, legacyCode: 'VR', color: '#f97316', icon: '🥗' },
  { name: 'Investimentos', type: AccountType.INVESTMENT, legacyCode: 'INV', color: '#8b5cf6', icon: '📈' },
  { name: 'Poupança', type: AccountType.SAVINGS, legacyCode: 'POUP', color: '#14b8a6', icon: '🏦' },
]

const DEFAULT_PAYMENT_METHODS = [
  { name: 'Débito', type: PaymentMethodType.DEBIT },
  { name: 'Crédito', type: PaymentMethodType.CREDIT },
  { name: 'PIX', type: PaymentMethodType.PIX },
  { name: 'Dinheiro', type: PaymentMethodType.CASH },
  { name: 'Transferência', type: PaymentMethodType.TRANSFER },
  { name: 'Boleto', type: PaymentMethodType.BOLETO },
  { name: 'Vale Alimentação', type: PaymentMethodType.FOOD_VOUCHER },
  { name: 'Vale Refeição', type: PaymentMethodType.MEAL_VOUCHER },
]

/**
 * Cria categorias, contas e formas de pagamento padrão para um workspace.
 * Chamado ao criar workspace ou no signIn callback.
 */
export async function seedWorkspaceDefaults(workspaceId: string) {
  // Contas padrão
  await Promise.all(
    DEFAULT_ACCOUNTS.map((account) =>
      prisma.bankAccount.create({
        data: { workspaceId, ...account },
      })
    )
  )

  // Formas de pagamento
  await Promise.all(
    DEFAULT_PAYMENT_METHODS.map((pm) =>
      prisma.paymentMethod.create({
        data: { workspaceId, ...pm },
      })
    )
  )

  // Categorias com subcategorias
  for (const cat of DEFAULT_CATEGORIES) {
    const parent = await prisma.category.create({
      data: {
        workspaceId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        legacyCode: cat.legacyCode,
      },
    })

    if (cat.children) {
      await Promise.all(
        cat.children.map((child) =>
          prisma.category.create({
            data: {
              workspaceId,
              name: child.name,
              icon: child.icon,
              color: cat.color,
              legacyCode: child.legacyCode,
              parentId: parent.id,
            },
          })
        )
      )
    }
  }
}
