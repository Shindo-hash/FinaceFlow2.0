import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Formatação
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export const formatDate = (date) => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export const formatMonthYear = (date) => {
  return format(new Date(date), 'MMMM yyyy', { locale: ptBR })
}

// Cálculos
export const calculateMonthlyTotal = (transactions, type) => {
  const today = new Date()
  const start = startOfMonth(today)
  const end = endOfMonth(today)

  return transactions
    .filter(t => 
      t.type === type && 
      isWithinInterval(new Date(t.date), { start, end })
    )
    .reduce((sum, t) => sum + t.amount, 0)
}

export const calculateByCategory = (transactions) => {
  const grouped = {}
  
  transactions.forEach(t => {
    const category = t.categories?.name || 'Sem categoria'
    if (!grouped[category]) {
      grouped[category] = { name: category, amount: 0, count: 0 }
    }
    grouped[category].amount += t.amount
    grouped[category].count += 1
  })

  return Object.values(grouped).sort((a, b) => b.amount - a.amount)
}

export const getCardPercentageUsed = (limitUsed, limitTotal) => {
  return Math.round((limitUsed / limitTotal) * 100)
}

export const getPercentageColor = (percentage) => {
  if (percentage < 50) return 'bg-green-500'
  if (percentage < 80) return 'bg-yellow-500'
  return 'bg-red-500'
}

export const checkPretensionStatus = (spent, pretension) => {
  const percentage = (spent / pretension) * 100
  
  if (percentage >= 100) return { status: 'exceeded', percentage }
  if (percentage >= 80) return { status: 'warning', percentage }
  return { status: 'ok', percentage }
}
