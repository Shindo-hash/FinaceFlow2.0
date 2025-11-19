import { useState, useEffect } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Wallet, AlertCircle, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, calculateMonthlyTotal, calculateByCategory, formatDate } from '../utils/formatting'
import { calculateForecast, getCurrentMonthSpending } from '../utils/forecast'

const Dashboard = ({ transactions, cards, user }) => {
  const [chartData, setChartData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [stats, setStats] = useState({ 
    income: 0, 
    expense: 0, 
    balance: 0,
    predicted: 0,
    hasHistory: false
  })

  const COLORS = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444']

  useEffect(() => {
    if (!transactions) return

    // Calcular totais
    const income = calculateMonthlyTotal(transactions, 'income')
    const expense = calculateMonthlyTotal(transactions, 'expense')
    const balance = income - expense

    // Previsão de gastos
    const { totalPredicted, hasHistory } = calculateForecast(transactions)

    setStats({ 
      income, 
      expense, 
      balance,
      predicted: totalPredicted,
      hasHistory
    })

    // Agrupar por categoria
    const byCategory = calculateByCategory(transactions.filter(t => t.type === 'expense'))
    setCategoryData(byCategory)

    // Dados para gráfico de linha (últimos 7 dias)
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayExpense = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0)

      last7Days.push({
        date: date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'short', day: 'numeric' }),
        despesa: dayExpense
      })
    }
    setChartData(last7Days)
  }, [transactions])

  const toggleCategory = (categoryName) => {
    if (expandedCategory === categoryName) {
      setExpandedCategory(null)
    } else {
      setExpandedCategory(categoryName)
    }
  }

  const getCategoryTransactions = (categoryName) => {
    return transactions
      .filter(t => t.categories?.name === categoryName && t.type === 'expense')
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Receitas</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.income)}</p>
            </div>
            <TrendingUp className="text-green-500 w-8 h-8" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Despesas</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.expense)}</p>
            </div>
            <Wallet className="text-red-500 w-8 h-8" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Saldo</p>
              <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>
            <AlertCircle className="text-blue-500 w-8 h-8" />
          </div>
        </div>

        {/* Card: Previsão */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Previsão Mensal</p>
              <p className="text-2xl font-bold text-purple-400">
                {stats.hasHistory ? formatCurrency(stats.predicted) : '-'}
              </p>
            </div>
            <TrendingDown className="text-purple-500 w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Gasto Semanal</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #475569' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Line type="monotone" dataKey="despesa" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categories com Expansão */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Top Categorias</h3>
        <div className="space-y-3">
          {categoryData.slice(0, 3).map((category, index) => (
            <div key={index}>
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer"
              >
                <span className="text-slate-300">{category.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-right">{formatCurrency(category.amount)}</span>
                  <span className="badge-warning">{category.count} transações</span>
                  {expandedCategory === category.name ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Transações Expandidas */}
              {expandedCategory === category.name && (
                <div className="mt-2 ml-4 space-y-2 bg-slate-900 rounded-lg p-3">
                  {getCategoryTransactions(category.name).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{transaction.description}</p>
                        <p className="text-xs text-slate-400">{formatDate(transaction.date)}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-400">
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard