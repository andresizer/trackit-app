import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const DEFAULT_CATEGORIES = [
  {
    name: 'Alimentação', icon: 'utensils', color: '#E85D24', legacyCode: 'A',
    children: [
      { name: 'Supermercado / Padaria', legacyCode: 'A1' },
      { name: 'Refeição fora de casa', legacyCode: 'A2' },
      { name: 'Delivery', legacyCode: 'A3' },
    ],
  },
  {
    name: 'Moradia', icon: 'home', color: '#185FA5', legacyCode: 'M',
    children: [
      { name: 'Aluguel / Financiamento', legacyCode: 'M1' },
      { name: 'Condomínio', legacyCode: 'M2' },
      { name: 'Utilidades domésticas', legacyCode: 'M7' },
    ],
  },
  {
    name: 'Transporte', icon: 'car', color: '#854F0B', legacyCode: 'T',
    children: [
      { name: 'Combustível', legacyCode: 'T1' },
      { name: 'Transporte público', legacyCode: 'T2' },
      { name: 'App (Uber, 99 etc.)', legacyCode: 'T3' },
    ],
  },
  {
    name: 'Saúde', icon: 'heart', color: '#A32D2D', legacyCode: 'S',
    children: [
      { name: 'Farmácia', legacyCode: 'S1' },
      { name: 'Consultas', legacyCode: 'S2' },
      { name: 'Plano', legacyCode: 'S3' },
    ],
  },
  {
    name: 'Educação', icon: 'book', color: '#0F6E56', legacyCode: 'E',
    children: [
      { name: 'Cursos', legacyCode: 'E1' },
      { name: 'Livros', legacyCode: 'E2' },
      { name: 'Mensalidade', legacyCode: 'E3' },
    ],
  },
  {
    name: 'Lazer', icon: 'smile', color: '#534AB7', legacyCode: 'L',
    children: [
      { name: 'Streaming', legacyCode: 'L1' },
      { name: 'Viagens', legacyCode: 'L2' },
      { name: 'Entretenimento', legacyCode: 'L3' },
    ],
  },
  {
    name: 'Vestuário', icon: 'shirt', color: '#D4537E', legacyCode: 'V',
    children: [],
  },
  {
    name: 'Receitas', icon: 'trending-up', color: '#3B6D11', legacyCode: 'R',
    children: [
      { name: 'Salário', legacyCode: 'R1' },
      { name: 'Freelance', legacyCode: 'R2' },
      { name: 'Outros', legacyCode: 'R9' },
    ],
  },
  {
    name: 'Investimentos', icon: 'bar-chart', color: '#633806', legacyCode: 'I',
    children: [
      { name: 'Aporte', legacyCode: 'I1' },
      { name: 'Rendimento', legacyCode: 'I2' },
      { name: 'Resgate', legacyCode: 'R8' },
    ],
  },
]

export const DEFAULT_ACCOUNTS = [
  { name: 'Conta Corrente', type: 'CHECKING', legacyCode: 'CC', color: '#185FA5', icon: '🏦' },
  { name: 'Dinheiro', type: 'CASH', legacyCode: 'DIN', color: '#3B6D11', icon: '💵' },
  { name: 'Cartão de Crédito', type: 'CREDIT_CARD', legacyCode: 'CRE', color: '#A32D2D', icon: '💳' },
  { name: 'Vale Alimentação', type: 'FOOD_VOUCHER', legacyCode: 'VA', color: '#E85D24', icon: '🍕' },
  { name: 'Vale Refeição', type: 'MEAL_VOUCHER', legacyCode: 'VR', color: '#854F0B', icon: '🍱' },
  { name: 'Investimentos', type: 'INVESTMENT', legacyCode: 'INV', color: '#633806', icon: '📈' },
]