import { useState, useEffect } from 'react'
import { Plus, Trash2, Target, ChevronLeft, ChevronRight, Printer, CheckCircle, AlertTriangle, TrendingDown, PiggyBank, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { formatCurrency } from '../utils/formatting'
import { supabase } from '../utils/supabase'
import { PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { calculateForecast, getCurrentMonthSpending } from '../utils/forecast'

const Metas = ({ user, categories, transactions }) => {
  const [activeTab, setActiveTab] = useState('metas')
  const [metas, setMetas] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportData, setReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  
  // Estados da Caixinha
  const [savingsMovements, setSavingsMovements] = useState([])
  const [savingsBalance, setSavingsBalance] = useState(0)
  const [showSavingsForm, setShowSavingsForm] = useState(false)
  const [savingsFormData, setSavingsFormData] = useState({
    amount: '',
    type: 'deposit',
    description: ''
  })
  const [monthlySurplus, setMonthlySurplus] = useState(0)

  const [forecastData, setForecastData] = useState({ 
    predicted: 0, 
    currentSpending: 0, 
    spendingDiff: 0, 
    spendingPercent: 0,
    hasHistory: false,
    monthsAnalyzed: 0,
    forecast: []
  })
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  })

  const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#14B8A6']
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  useEffect(() => {
    if (user?.id) fetchMetas()
  }, [user])

  useEffect(() => {
    if (activeTab === 'relatorios' && user?.id) fetchReportData()
  }, [activeTab, selectedMonth, selectedYear, user])

  useEffect(() => {
    if (activeTab === 'previsao' && transactions) {
      const { totalPredicted, hasHistory, monthsAnalyzed, forecast } = calculateForecast(transactions)
      const currentSpending = getCurrentMonthSpending(transactions)
      const spendingDiff = currentSpending - totalPredicted
      const spendingPercent = totalPredicted > 0 ? ((currentSpending / totalPredicted) * 100) : 0

      setForecastData({
        predicted: totalPredicted,
        currentSpending,
        spendingDiff,
        spendingPercent,
        hasHistory,
        monthsAnalyzed,
        forecast
      })
    }
  }, [activeTab, transactions])

  // Buscar dados da caixinha
  useEffect(() => {
    if (activeTab === 'caixinha' && user?.id) {
      fetchSavings()
      calculateMonthlySurplus()
    }
  }, [activeTab, user, transactions])

  const fetchSavings = async () => {
    try {
      const { data, error } = await supabase
        .from('savings_box')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSavingsMovements(data || [])
      
      // Calcular saldo
      const balance = (data || []).reduce((acc, mov) => {
        return mov.type === 'deposit' ? acc + parseFloat(mov.amount) : acc - parseFloat(mov.amount)
      }, 0)
      
      setSavingsBalance(balance)
    } catch (err) {
      console.error('Erro ao buscar caixinha:', err)
    }
  }

  const calculateMonthlySurplus = () => {
    if (!transactions) return

    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    const monthTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth)
    
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
    
    setMonthlySurplus(income - expense)
  }

  const handleSavingsSubmit = async () => {
    setMessage('')

    if (!savingsFormData.amount || parseFloat(savingsFormData.amount) <= 0) {
      setMessage('❌ Informe um valor válido')
      return
    }

    // Validar saque
    if (savingsFormData.type === 'withdrawal' && parseFloat(savingsFormData.amount) > savingsBalance) {
      setMessage('❌ Saldo insuficiente na caixinha')
      return
    }

    setLoading(true)

    try {
      const today = new Date()
      const { error } = await supabase
        .from('savings_box')
        .insert([{
          user_id: user.id,
          amount: parseFloat(savingsFormData.amount),
          type: savingsFormData.type,
          description: savingsFormData.description || null,
          month: today.getMonth() + 1,
          year: today.getFullYear()
        }])

      if (error) throw error

      setMessage('✅ Operação realizada com sucesso!')
      setSavingsFormData({ amount: '', type: 'deposit', description: '' })
      setShowSavingsForm(false)
      fetchSavings()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSavings = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return

    try {
      const { error } = await supabase
        .from('savings_box')
        .delete()
        .eq('id', id)

      if (error) throw error

      setMessage('✅ Movimentação excluída!')
      fetchSavings()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erro: ' + err.message)
    }
  }

  const fetchMetas = async () => {
    try {
      const { data } = await supabase.from('pretensions').select('*, categories(name)').eq('user_id', user.id).order('created_at', { ascending: false })
      setMetas(data || [])
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  const fetchReportData = async () => {
    setLoadingReport(true)
    try {
      const { data: invoicesData } = await supabase.from('invoices').select('id').eq('user_id', user.id).eq('month', selectedMonth + 1).eq('year', selectedYear)
      const invoiceIds = invoicesData?.map(i => i.id) || []
      const { data: parcelas } = await supabase.from('installments').select('amount, transaction:transactions(category_id)').in('invoice_id', invoiceIds)
      const { data: metasData } = await supabase.from('pretensions').select('*, categories(name)').eq('user_id', user.id).eq('month', selectedMonth + 1).eq('year', selectedYear)

      const gastosPorCategoria = {}
      parcelas?.forEach(p => {
        const catId = p.transaction?.category_id
        if (catId) gastosPorCategoria[catId] = (gastosPorCategoria[catId] || 0) + parseFloat(p.amount)
      })

      const totalGasto = Object.values(gastosPorCategoria).reduce((s, v) => s + v, 0)
      const totalMetas = metasData?.reduce((s, m) => s + parseFloat(m.amount), 0) || 0

      const comparacao = categories.map(cat => {
        const gasto = gastosPorCategoria[cat.id] || 0
        const meta = metasData?.find(m => m.category_id === cat.id)
        const metaValue = meta ? parseFloat(meta.amount) : 0
        const percentual = metaValue > 0 ? (gasto / metaValue) * 100 : 0
        const diferenca = gasto - metaValue
        return {
          categoria: cat.name,
          gasto,
          meta: metaValue,
          percentual,
          diferenca,
          status: metaValue === 0 ? 'sem-meta' : (gasto <= metaValue ? 'ok' : 'ultrapassou')
        }
      }).filter(item => item.gasto > 0 || item.meta > 0)

      setReportData({ totalGasto, totalMetas, economia: totalMetas - totalGasto, comparacao })
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoadingReport(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.category_id || !formData.amount) {
      setMessage('❌ Preencha todos os campos')
      return
    }
    setLoading(true)
    try {
      await supabase.from('pretensions').insert([{ user_id: user.id, category_id: formData.category_id, amount: parseFloat(formData.amount), month: formData.month, year: formData.year }])
      setMessage('✅ Meta criada!')
      setFormData({ category_id: '', amount: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })
      setShowForm(false)
      fetchMetas()
    } catch (err) {
      setMessage('❌ Erro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await supabase.from('pretensions').delete().eq('id', id)
    fetchMetas()
  }

  const changeMonth = (dir) => {
    let newMonth = selectedMonth + dir
    let newYear = selectedYear
    if (newMonth < 0) { newMonth = 11; newYear-- }
    if (newMonth > 11) { newMonth = 0; newYear++ }
    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  const pieData = reportData?.comparacao.filter(i => i.gasto > 0).map(i => ({ name: i.categoria, value: i.gasto })) || []
  const barData = reportData?.comparacao.filter(i => i.meta > 0).map(i => ({ categoria: i.categoria.substring(0, 10), Meta: i.meta, Gasto: i.gasto })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('metas')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'metas' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>🎯 Minhas Metas</button>
          <button onClick={() => setActiveTab('previsao')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'previsao' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>🔮 Previsão</button>
          <button onClick={() => setActiveTab('caixinha')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'caixinha' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>💰 Caixinha</button>
          <button onClick={() => setActiveTab('relatorios')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'relatorios' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'}`}>📊 Relatórios</button>
        </div>
        {activeTab === 'metas' && <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Nova Meta</button>}
        {activeTab === 'caixinha' && <button onClick={() => setShowSavingsForm(!showSavingsForm)} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Movimentar</button>}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          message.includes('✅') 
            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
            : 'bg-red-500/20 border border-red-500/50 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {activeTab === 'metas' && (
        <>
          {showForm && (
            <div className="card bg-slate-800 border-2 border-purple-600">
              <h3 className="text-lg font-semibold mb-4">Nova Meta</h3>
              <div className="space-y-4">
                <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="input-field w-full">
                  <option value="">Categoria</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="Valor (R$)" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="input-field w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <select value={formData.month} onChange={e => setFormData({...formData, month: parseInt(e.target.value)})} className="input-field">
                    {monthNames.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
                  </select>
                  <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} className="input-field" min="2020" max="2030" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">{loading ? 'Salvando...' : 'Salvar'}</button>
                  <button onClick={() => { setShowForm(false); setMessage('') }} className="btn-secondary flex-1">Cancelar</button>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {metas.length === 0 ? (
              <div className="card text-center py-12"><Target className="w-16 h-16 mx-auto text-slate-600 mb-4" /><p className="text-slate-400">Nenhuma meta cadastrada</p></div>
            ) : (
              metas.map(m => (
                <div key={m.id} className="card flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-white">{m.categories?.name}</p>
                    <p className="text-sm text-slate-400">{monthNames[m.month - 1]} {m.year} • {formatCurrency(m.amount)}</p>
                  </div>
                  <button onClick={() => handleDelete(m.id)} className="p-2 hover:bg-slate-700 rounded-lg"><Trash2 className="w-5 h-5 text-red-400" /></button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'previsao' && (
        <div className="space-y-6">
          {!forecastData.hasHistory ? (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Previsão de Gastos</h3>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                <TrendingDown className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <p className="text-blue-400 text-lg mb-2">
                  📊 Complete pelo menos 1 mês de transações para ver sua previsão de gastos
                </p>
                <p className="text-slate-400 text-sm">
                  A previsão é calculada com base na média dos seus gastos em meses anteriores
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">
                  🔮 Previsão de Gastos (baseado em {forecastData.monthsAnalyzed} {forecastData.monthsAnalyzed === 1 ? 'mês' : 'meses'})
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-slate-400 text-sm">Gasto atual este mês</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(forecastData.currentSpending)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">Meta baseada no histórico</p>
                      <p className="text-xl font-bold text-purple-400">{formatCurrency(forecastData.predicted)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          forecastData.spendingPercent > 100 ? 'bg-red-500' : 
                          forecastData.spendingPercent > 80 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(forecastData.spendingPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{forecastData.spendingPercent.toFixed(0)}% da previsão</span>
                      {forecastData.spendingDiff !== 0 && (
                        <span className={forecastData.spendingDiff > 0 ? 'text-red-400' : 'text-green-400'}>
                          {forecastData.spendingDiff > 0 ? '+' : ''}{formatCurrency(Math.abs(forecastData.spendingDiff))}
                        </span>
                      )}
                    </div>
                  </div>

                  {forecastData.spendingPercent > 100 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-red-400 text-sm">
                        ⚠️ Você já ultrapassou a previsão! Considere revisar seus gastos.
                      </p>
                    </div>
                  )}
                  {forecastData.spendingPercent > 80 && forecastData.spendingPercent <= 100 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm">
                        ⚡ Atenção! Você já gastou {forecastData.spendingPercent.toFixed(0)}% da previsão.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {forecastData.forecast && forecastData.forecast.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">📊 Previsão por Categoria</h3>
                  <div className="space-y-3">
                    {forecastData.forecast.map((item, index) => (
                      <div key={index} className="p-4 bg-slate-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-white">{item.category}</span>
                          <span className="text-purple-400 font-bold">{formatCurrency(item.predicted)}</span>
                        </div>
                        <p className="text-sm text-slate-400">
                          Média de {item.avgTransactions} transações por mês
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'caixinha' && (
        <div className="space-y-6">
          {/* Card de Saldo */}
          <div className="card bg-gradient-to-br from-green-600 to-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm mb-1">Saldo na Caixinha</p>
                <p className="text-4xl font-bold text-white">{formatCurrency(savingsBalance)}</p>
              </div>
              <PiggyBank className="w-16 h-16 text-green-200" />
            </div>
          </div>

          {/* Sugestão de Economia */}
          {monthlySurplus > 0 && (
            <div className="card bg-blue-500/10 border border-blue-500/30">
              <h3 className="text-lg font-semibold mb-2 text-blue-400">💡 Sugestão de Economia</h3>
              <p className="text-slate-300 mb-4">
                Você tem uma sobra de <span className="font-bold text-white">{formatCurrency(monthlySurplus)}</span> este mês. Que tal guardar um pouco?
              </p>
              <button
                onClick={() => {
                  setSavingsFormData({ amount: monthlySurplus.toFixed(2), type: 'deposit', description: 'Sobra do mês' })
                  setShowSavingsForm(true)
                }}
                className="btn-primary"
              >
                Guardar Sobra
              </button>
            </div>
          )}

          {/* Formulário */}
          {showSavingsForm && (
            <div className="card bg-slate-800 border-2 border-purple-600">
              <h3 className="text-lg font-semibold mb-4">Movimentar Caixinha</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="deposit"
                      checked={savingsFormData.type === 'deposit'}
                      onChange={(e) => setSavingsFormData({ ...savingsFormData, type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-green-400">Depositar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="withdrawal"
                      checked={savingsFormData.type === 'withdrawal'}
                      onChange={(e) => setSavingsFormData({ ...savingsFormData, type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-red-400">Sacar</span>
                  </label>
                </div>

                <input
                  type="number"
                  placeholder="Valor (R$)"
                  value={savingsFormData.amount}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, amount: e.target.value })}
                  className="input-field w-full"
                  step="0.01"
                />

                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={savingsFormData.description}
                  onChange={(e) => setSavingsFormData({ ...savingsFormData, description: e.target.value })}
                  className="input-field w-full"
                />

                <div className="flex gap-2">
                  <button 
                    onClick={handleSavingsSubmit} 
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Salvando...' : 'Confirmar'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowSavingsForm(false)
                      setSavingsFormData({ amount: '', type: 'deposit', description: '' })
                    }} 
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Histórico de Movimentações</h3>
            <div className="space-y-2">
              {savingsMovements.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhuma movimentação ainda</p>
              ) : (
                savingsMovements.map(mov => (
                  <div key={mov.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {mov.type === 'deposit' ? (
                        <ArrowDownCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-red-400" />
                      )}
                      <div>
                        <p className="font-medium text-white">
                          {mov.type === 'deposit' ? 'Depósito' : 'Saque'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {mov.description || 'Sem descrição'} • {new Date(mov.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${mov.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {mov.type === 'deposit' ? '+' : '-'} {formatCurrency(mov.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteSavings(mov.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          <div className="card flex items-center justify-between">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-700 rounded-lg"><ChevronLeft className="w-6 h-6" /></button>
            <h3 className="text-2xl font-bold">{monthNames[selectedMonth]} {selectedYear}</h3>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-700 rounded-lg"><ChevronRight className="w-6 h-6" /></button>
          </div>

          {loadingReport ? (
            <div className="card text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div><p>Gerando...</p></div>
          ) : reportData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-gradient-to-br from-purple-600 to-purple-700">
                  <p className="text-purple-200 text-sm">Total Gasto</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(reportData.totalGasto)}</p>
                </div>
                <div className="card bg-gradient-to-br from-blue-600 to-blue-700">
                  <p className="text-blue-200 text-sm">Total Metas</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(reportData.totalMetas)}</p>
                </div>
                <div className={`card bg-gradient-to-br ${reportData.economia >= 0 ? 'from-green-600 to-green-700' : 'from-red-600 to-red-700'}`}>
                  <p className="text-white text-sm">{reportData.economia >= 0 ? 'Economia' : 'Ultrapassou'}</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(Math.abs(reportData.economia))}</p>
                </div>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">📊 Meta vs Real</h3>
                <div className="space-y-4">
                  {reportData.comparacao.map((item, i) => (
                    <div key={i} className="border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">{item.categoria}</h4>
                        {item.status === 'ok' ? <CheckCircle className="w-6 h-6 text-green-400" /> : item.status === 'ultrapassou' ? <AlertTriangle className="w-6 h-6 text-red-400" /> : null}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div><p className="text-slate-400 text-sm">Meta</p><p className="font-semibold">{formatCurrency(item.meta)}</p></div>
                        <div><p className="text-slate-400 text-sm">Gasto</p><p className="font-semibold">{formatCurrency(item.gasto)}</p></div>
                      </div>
                      {item.meta > 0 && (
                        <>
                          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
                            <div className={`h-full rounded-full ${item.percentual <= 80 ? 'bg-green-500' : item.percentual <= 100 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${Math.min(item.percentual, 100)}%`}} />
                          </div>
                          <div className={`text-sm font-semibold ${item.diferenca <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {item.diferenca <= 0 ? `✅ PARABÉNS! Economizou ${formatCurrency(Math.abs(item.diferenca))} (${Math.round(Math.abs((item.diferenca / item.meta) * 100))}%)` : `⚠️ ATENÇÃO! Ultrapassou em ${formatCurrency(item.diferenca)} (+${Math.round((item.diferenca / item.meta) * 100)}%)`}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {pieData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="text-xl font-bold mb-4">🥧 Por Categoria</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={e => e.name} outerRadius={100} dataKey="value">
                          {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {barData.length > 0 && (
                    <div className="card">
                      <h3 className="text-xl font-bold mb-4">📊 Comparação</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="categoria" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip formatter={v => formatCurrency(v)} contentStyle={{backgroundColor: '#1F2937', border: 'none'}} />
                          <Legend />
                          <Bar dataKey="Meta" fill="#3B82F6" />
                          <Bar dataKey="Gasto" fill="#8B5CF6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 print:hidden">
                <Printer className="w-5 h-5" />Imprimir / Salvar PDF
              </button>
            </>
          ) : (
            <div className="card text-center py-12"><p className="text-slate-400">Sem dados para este período</p></div>
          )}
        </div>
      )}
    </div>
  )
}

export default Metas