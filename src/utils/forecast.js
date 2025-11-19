export const calculateForecast = (transactions) => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Pega transações de meses ANTERIORES (não conta o atual)
  const pastMonthsTransactions = transactions.filter(t => {
    const transDate = new Date(t.date)
    const isExpense = t.type === 'expense'
    const isPastMonth = transDate.getMonth() !== currentMonth || transDate.getFullYear() !== currentYear
    
    return isExpense && isPastMonth
  })

  if (pastMonthsTransactions.length === 0) {
    return { forecast: [], totalPredicted: 0, hasHistory: false }
  }

  // Identifica quantos meses completos tem
  const monthsWithData = new Set()
  pastMonthsTransactions.forEach(t => {
    const date = new Date(t.date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    monthsWithData.add(key)
  })

  const totalMonths = monthsWithData.size

  // Precisa ter pelo menos 1 mês completo
  if (totalMonths === 0) {
    return { forecast: [], totalPredicted: 0, hasHistory: false }
  }

  // Agrupa por categoria e calcula média mensal
  const categoryTotals = {}
  
  pastMonthsTransactions.forEach(t => {
    const categoryName = t.categories?.name || 'Outros'
    if (!categoryTotals[categoryName]) {
      categoryTotals[categoryName] = { total: 0, count: 0 }
    }
    categoryTotals[categoryName].total += t.amount
    categoryTotals[categoryName].count += 1
  })

  // Calcula previsão (média mensal por categoria)
  const forecast = Object.entries(categoryTotals).map(([name, data]) => ({
    category: name,
    predicted: data.total / totalMonths,
    avgTransactions: (data.count / totalMonths).toFixed(1)
  }))

  const totalPredicted = forecast.reduce((sum, f) => sum + f.predicted, 0)

  return { 
    forecast, 
    totalPredicted, 
    hasHistory: true,
    monthsAnalyzed: totalMonths 
  }
}

export const getCurrentMonthSpending = (transactions) => {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  return transactions
    .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0)
}