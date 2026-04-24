import * as XLSX from 'xlsx'

export async function GET() {
  const headers = ['data', 'descricao', 'valor', 'conta', 'categoria', 'subcategoria']

  const exampleRows = [
    {
      data: '25/04/2026',
      descricao: 'Supermercado Extra',
      valor: 150.9,
      conta: 'Nubank',
      categoria: 'Alimentação',
      subcategoria: 'Mercado',
    },
    {
      data: '26/04/2026',
      descricao: 'Salário abril',
      valor: 5000,
      conta: 'Itaú CC',
      categoria: 'Receitas',
      subcategoria: '',
    },
    {
      data: '27/04/2026',
      descricao: 'Conta de luz',
      valor: 210.5,
      conta: 'Nubank',
      categoria: 'Moradia',
      subcategoria: 'Energia',
    },
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers })

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }))

  XLSX.utils.book_append_sheet(wb, ws, 'Transações')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-importacao.xlsx"',
    },
  })
}
