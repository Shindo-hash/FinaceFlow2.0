import { useState, useEffect } from 'react'
import { Plus, Trash2, Filter, Calendar, CheckCircle, Clock, Repeat, Power, PowerOff } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatting'
import { supabase } from '../utils/supabase'

const Transactions = ({ transactions, categories, cards, onAdd, onDelete, user }) => {
  const [activeTab, setActiveTab] = useState('transactions')
  const [showForm, setShowForm] = useState(false)
  const [showBillForm, setShowBillForm] = useState(false)
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [bills, setBills] = useState([])
  const [loadingBills, setLoadingBills] = useState(false)
  const [subscriptions, setSubscriptions] = useState([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false)
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category_id: '',
    card_id: '',
    date: new Date().toISOString().split('T')[0],
    installments: '1'
  })

  const [billFormData, setBillFormData] = useState({
  name: '',
  amount: '',
  due_date: new Date().toISOString().split('T')[0],
  type: 'fixed',
  total_installments: '1',
  current_installment: '1',
  category_id: '',
  notes: '',
  auto_renew: false,
  is_fixed_amount: true
})

  const [subscriptionFormData, setSubscriptionFormData] = useState({
    name: '',
    amount: '',
    card_id: '',
    billing_day: '1',
    category_id: ''
  })

  // Buscar contas a pagar
  useEffect(() => {
    if (activeTab === 'bills') {
      fetchBills()
    }
  }, [activeTab])

  // Buscar assinaturas
  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    }
  }, [activeTab])

  const fetchBills = async () => {
    setLoadingBills(true)
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, categories(name)')
        .order('due_date', { ascending: true })

      if (error) throw error
      setBills(data || [])
    } catch (err) {
      console.error('Erro ao buscar contas:', err)
    } finally {
      setLoadingBills(false)
    }
  }

  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true)
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, cards(name), categories(name)')
        .order('name', { ascending: true })

      if (error) throw error
      setSubscriptions(data || [])
    } catch (err) {
      console.error('Erro ao buscar assinaturas:', err)
    } finally {
      setLoadingSubscriptions(false)
    }
  }

  const handleSubmit = async () => {
    setMessage('')

    if (!formData.description || !formData.amount) {
      setMessage('❌ Descrição e valor são obrigatórios')
      return
    }

    if (!formData.category_id) {
      setMessage('❌ Categoria é obrigatória')
      return
    }

    if (formData.type === 'expense' && formData.card_id === '' && !formData.card_id) {
      setMessage('❌ Selecione um método de pagamento (Cartão ou Débito/Transferência)')
      return
    }

    // Validação de limite
    if (formData.card_id) {
      const selectedCard = cards.find(c => c.id === formData.card_id)
      
      if (selectedCard) {
        const totalCompra = parseFloat(formData.amount) * parseInt(formData.installments || 1)
        const limiteDisponivel = selectedCard.limit_total - (selectedCard.limit_used || 0)
        
        if (totalCompra > limiteDisponivel) {
          setMessage(
            `❌ Limite insuficiente! ` +
            `Você precisa de ${formatCurrency(totalCompra)} mas tem apenas ${formatCurrency(limiteDisponivel)} disponível.`
          )
          return
        }
      }
    }

    setLoading(true)

    try {
      const dataToSend = {
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id === '' ? null : formData.category_id,
        card_id: formData.card_id === '' ? null : formData.card_id,
        installments: parseInt(formData.installments) || 1
      }

      await onAdd(dataToSend)
      setMessage('✅ Transação registrada com sucesso!')
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category_id: '',
        card_id: '',
        date: new Date().toISOString().split('T')[0],
        installments: '1'
      })
      setTimeout(() => {
        setShowForm(false)
        setMessage('')
      }, 2000)
    } catch (err) {
      setMessage('❌ Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBillSubmit = async () => {
  setMessage('')

  if (!billFormData.name || !billFormData.amount || !billFormData.due_date) {
    setMessage('❌ Nome, valor e data de vencimento são obrigatórios')
    return
  }

  setLoading(true)

  try {
    const { error } = await supabase
      .from('bills')
      .insert([{
        user_id: user.id,
        name: billFormData.name,
        amount: parseFloat(billFormData.amount),
        due_date: billFormData.due_date,
        type: billFormData.type,
        total_installments: parseInt(billFormData.total_installments) || 1,
        current_installment: parseInt(billFormData.current_installment) || 1,
        category_id: billFormData.category_id || null,
        notes: billFormData.notes || null,
        status: 'pending',
        auto_renew: billFormData.auto_renew,
        is_fixed_amount: billFormData.is_fixed_amount
      }])

    if (error) throw error

    setMessage('✅ Conta cadastrada com sucesso!')
    setBillFormData({
      name: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      type: 'fixed',
      total_installments: '1',
      current_installment: '1',
      category_id: '',
      notes: '',
      auto_renew: false,
      is_fixed_amount: true
    })
    
    fetchBills()
    
    setTimeout(() => {
      setShowBillForm(false)
      setMessage('')
    }, 2000)
  } catch (err) {
    setMessage('❌ Erro ao salvar: ' + err.message)
  } finally {
    setLoading(false)
  }
}

  const handleSubscriptionSubmit = async () => {
    setMessage('')

    if (!subscriptionFormData.name || !subscriptionFormData.amount || !subscriptionFormData.card_id) {
      setMessage('❌ Nome, valor e cartão são obrigatórios')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: user.id,
          name: subscriptionFormData.name,
          amount: parseFloat(subscriptionFormData.amount),
          card_id: subscriptionFormData.card_id,
          billing_day: parseInt(subscriptionFormData.billing_day),
          category_id: subscriptionFormData.category_id || null,
          status: 'active'
        }])

      if (error) throw error

      setMessage('✅ Assinatura cadastrada com sucesso!')
      setSubscriptionFormData({
        name: '',
        amount: '',
        card_id: '',
        billing_day: '1',
        category_id: ''
      })
      
      fetchSubscriptions()
      
      setTimeout(() => {
        setShowSubscriptionForm(false)
        setMessage('')
      }, 2000)
    } catch (err) {
      setMessage('❌ Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePayBill = async (billId, bill) => {
  try {
    // 1. Marcar conta como paga
    const { error: billError } = await supabase
      .from('bills')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString()
      })
      .eq('id', billId)

    if (billError) throw billError

    // 2. Criar transação de despesa
    await onAdd({
      description: `Pagamento: ${bill.name}`,
      amount: parseFloat(bill.amount),
      type: 'expense',
      category_id: bill.category_id || null,
      card_id: null,
      date: new Date().toISOString().split('T')[0],
      installments: 1
    })

    // 3. Se tiver renovação automática, criar próxima conta
    if (bill.auto_renew && bill.type === 'fixed') {
      const nextDueDate = new Date(bill.due_date)
      nextDueDate.setMonth(nextDueDate.getMonth() + 1)

      await supabase
        .from('bills')
        .insert([{
          user_id: user.id,
          name: bill.name,
          amount: bill.is_fixed_amount ? parseFloat(bill.amount) : 0,
          due_date: nextDueDate.toISOString().split('T')[0],
          type: bill.type,
          total_installments: bill.total_installments,
          current_installment: bill.current_installment,
          category_id: bill.category_id,
          notes: bill.notes,
          status: 'pending',
          auto_renew: bill.auto_renew,
          is_fixed_amount: bill.is_fixed_amount
        }])

      if (!bill.is_fixed_amount) {
        setMessage('✅ Conta paga! Próxima conta criada - lembre de atualizar o valor variável.')
      } else {
        setMessage('✅ Conta paga! Próxima conta já foi criada automaticamente.')
      }
    } else {
      setMessage('✅ Conta paga e lançada nas transações!')
    }

    fetchBills()
    
    setTimeout(() => setMessage(''), 4000)
  } catch (err) {
    setMessage('❌ Erro: ' + err.message)
  }
}

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId)

      if (error) throw error

      setMessage('✅ Conta excluída!')
      fetchBills()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erro: ' + err.message)
    }
  }

  const handleToggleSubscription = async (subId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subId)

      if (error) throw error

      setMessage(`✅ Assinatura ${newStatus === 'active' ? 'ativada' : 'desativada'}!`)
      fetchSubscriptions()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erro: ' + err.message)
    }
  }

  const handleDeleteSubscription = async (subId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta assinatura?')) return

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', subId)

      if (error) throw error

      setMessage('✅ Assinatura excluída!')
      fetchSubscriptions()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('❌ Erro: ' + err.message)
    }
  }

  const filtered = transactions.filter(t => {
    if (filter === 'all') return true
    return t.type === filter
  })

  const getLimitPreview = () => {
    if (!formData.card_id || !formData.amount) return null
    
    const selectedCard = cards.find(c => c.id === formData.card_id)
    if (!selectedCard) return null
    
    const totalCompra = parseFloat(formData.amount) * parseInt(formData.installments || 1)
    const limiteAtual = selectedCard.limit_used || 0
    const novoLimite = limiteAtual + totalCompra
    const limiteDisponivel = selectedCard.limit_total - limiteAtual
    const percentual = Math.round((novoLimite / selectedCard.limit_total) * 100)
    
    const suficiente = totalCompra <= limiteDisponivel
    
    return {
      suficiente,
      totalCompra,
      limiteDisponivel,
      novoLimite,
      limiteTotal: selectedCard.limit_total,
      percentual
    }
  }

  const limitPreview = getLimitPreview()

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const pendingBills = bills.filter(b => b.status === 'pending')
  const paidBills = bills.filter(b => b.status === 'paid')
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active')
  const inactiveSubscriptions = subscriptions.filter(s => s.status === 'inactive')

  // Filtrar apenas categorias de despesa
  const expenseCategories = categories?.filter(c => c.type === 'expense') || []

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'transactions' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            📊 Transações
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'bills' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            📅 Contas a Pagar
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'subscriptions' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'
            }`}
          >
            🔄 Assinaturas
          </button>
        </div>
        
        {activeTab === 'transactions' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar
          </button>
        )}
        
        {activeTab === 'bills' && (
          <button
            onClick={() => setShowBillForm(!showBillForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Conta
          </button>
        )}

        {activeTab === 'subscriptions' && (
          <button
            onClick={() => setShowSubscriptionForm(!showSubscriptionForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Assinatura
          </button>
        )}
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

      {/* Conteúdo da aba TRANSAÇÕES */}
      {activeTab === 'transactions' && (
        <>
          {showForm && (
            <div className="card bg-slate-800 border-2 border-purple-600">
              <h3 className="text-lg font-semibold mb-4">Nova Transação</h3>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="income"
                      checked={formData.type === 'income'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-green-400">Receita</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="expense"
                      checked={formData.type === 'expense'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-4 h-4"
                    />
                    <span className="text-red-400">Despesa</span>
                  </label>
                </div>

                <input
                  type="text"
                  placeholder="Descrição"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field w-full"
                />

                <input
                  type="number"
                  placeholder="Valor (R$)"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input-field w-full"
                  step="0.01"
                />

                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories?.filter(c => c.type === formData.type).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                {formData.type === 'expense' && (
                  <>
                    <select
                      value={formData.card_id || ''}
                      onChange={(e) => setFormData({ ...formData, card_id: e.target.value || null })}
                      className="input-field w-full"
                    >
                      <option value="">Débito/Transferência</option>
                      {cards?.map(card => (
                        <option key={card.id} value={card.id}>{card.name}</option>
                      ))}
                    </select>

                    {formData.card_id && (
                      <input
                        type="number"
                        placeholder="Parcelas"
                        value={formData.installments}
                        onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                        className="input-field w-full"
                        min="1"
                        max="24"
                      />
                    )}

                    {limitPreview && (
                      <div className={`p-4 rounded-lg border ${
                        limitPreview.suficiente 
                          ? 'bg-blue-500/10 border-blue-500/30' 
                          : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        <p className="text-sm font-semibold mb-2">
                          {limitPreview.suficiente ? '✅ Limite suficiente' : '❌ Limite insuficiente'}
                        </p>
                        <div className="space-y-1 text-xs">
                          <p className="text-slate-300">
                            Valor total: <span className="font-semibold">{formatCurrency(limitPreview.totalCompra)}</span>
                          </p>
                          <p className="text-slate-300">
                            Limite disponível: <span className="font-semibold">{formatCurrency(limitPreview.limiteDisponivel)}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field w-full"
                />

                <div className="flex gap-2">
                  <button 
                    onClick={handleSubmit} 
                    disabled={loading || (limitPreview && !limitPreview.suficiente)}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowForm(false)
                      setMessage('')
                    }} 
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('income')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'income' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setFilter('expense')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'expense' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Despesas
            </button>
          </div>

          <div className="space-y-2">
            {filtered.map(transaction => (
              <div key={transaction.id} className="card flex items-center justify-between hover:bg-slate-800/80">
                <div className="flex-1">
                  <p className="font-medium text-white">{transaction.description}</p>
                  <p className="text-sm text-slate-400">
                    {transaction.categories?.name} • {formatDate(transaction.date)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-semibold ${
                    transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </span>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Conteúdo da aba CONTAS A PAGAR */}
      {activeTab === 'bills' && (
        <>
          {showBillForm && (
            <div className="card bg-slate-800 border-2 border-purple-600">
              <h3 className="text-lg font-semibold mb-4">Nova Conta a Pagar</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome da conta (ex: Aluguel, Energia)"
                  value={billFormData.name}
                  onChange={(e) => setBillFormData({ ...billFormData, name: e.target.value })}
                  className="input-field w-full"
                />

                <input
                  type="number"
                  placeholder="Valor (R$)"
                  value={billFormData.amount}
                  onChange={(e) => setBillFormData({ ...billFormData, amount: e.target.value })}
                  className="input-field w-full"
                  step="0.01"
                />

                <input
                  type="date"
                  value={billFormData.due_date}
                  onChange={(e) => setBillFormData({ ...billFormData, due_date: e.target.value })}
                  className="input-field w-full"
                />

                <select
                  value={billFormData.type}
                  onChange={(e) => setBillFormData({ ...billFormData, type: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="fixed">Conta Fixa (mensal)</option>
                  <option value="installment">Parcelada</option>
                </select>

                {billFormData.type === 'installment' && (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Parcela atual"
                      value={billFormData.current_installment}
                      onChange={(e) => setBillFormData({ ...billFormData, current_installment: e.target.value })}
                      className="input-field"
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Total de parcelas"
                      value={billFormData.total_installments}
                      onChange={(e) => setBillFormData({ ...billFormData, total_installments: e.target.value })}
                      className="input-field"
                      min="1"
                    />
                  </div>
                )}

                <select
                  value={billFormData.category_id}
                  onChange={(e) => setBillFormData({ ...billFormData, category_id: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Categoria (opcional)</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                 <textarea
  placeholder="Observações (opcional)"
  value={billFormData.notes}
  onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
  className="input-field w-full"
  rows="3"
/>

{/* ADICIONA AQUI ↓ */}
<div className="space-y-3 p-4 bg-slate-700/50 rounded-lg">
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={billFormData.auto_renew}
      onChange={(e) => setBillFormData({ ...billFormData, auto_renew: e.target.checked })}
      className="w-4 h-4"
    />
    <span className="text-slate-300">🔄 Renovar automaticamente todo mês</span>
  </label>

  {billFormData.auto_renew && (
    <label className="flex items-center gap-2 cursor-pointer ml-6">
      <input
        type="checkbox"
        checked={billFormData.is_fixed_amount}
        onChange={(e) => setBillFormData({ ...billFormData, is_fixed_amount: e.target.checked })}
        className="w-4 h-4"
      />
      <span className="text-slate-300">
        {billFormData.is_fixed_amount ? '💰 Valor fixo (mesmo valor todo mês)' : '📊 Valor variável (precisa atualizar)'}
      </span>
    </label>
  )}

  {billFormData.auto_renew && !billFormData.is_fixed_amount && (
    <div className="ml-6 text-xs text-yellow-400">
      ⚠️ A próxima conta será criada com valor R$ 0,00. Você precisará atualizar o valor manualmente.
    </div>
  )}
</div>

<div className="flex gap-2">
  <button 
    onClick={handleBillSubmit}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowBillForm(false)
                      setMessage('')
                    }} 
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingBills ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-slate-300">Carregando contas...</p>
            </div>
          ) : (
            <>
              {pendingBills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    Pendentes ({pendingBills.length})
                  </h3>
                  {pendingBills.map(bill => {
                    const daysUntilDue = getDaysUntilDue(bill.due_date)
                    const isOverdue = daysUntilDue < 0
                    const isDueSoon = daysUntilDue <= 4 && daysUntilDue >= 0
                    
                    return (
                      <div 
                        key={bill.id} 
                        className={`card ${
                          isOverdue ? 'border-l-4 border-red-500' : 
                          isDueSoon ? 'border-l-4 border-yellow-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-white">{bill.name}</h4>
                              {bill.type === 'installment' && (
                                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                                  {bill.current_installment}/{bill.total_installments}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mb-2">
                              {bill.categories?.name && `${bill.categories.name} • `}
                              Vence em {new Date(bill.due_date).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-lg font-bold text-white">
                              {formatCurrency(bill.amount)}
                            </p>
                            {isOverdue && (
                              <p className="text-sm text-red-400 mt-1">
                                ⚠️ Vencida há {Math.abs(daysUntilDue)} dias
                              </p>
                            )}
                            {isDueSoon && !isOverdue && (
                              <p className="text-sm text-yellow-400 mt-1">
                                ⚡ Vence em {daysUntilDue} {daysUntilDue === 1 ? 'dia' : 'dias'}
                              </p>
                            )}
                            {bill.notes && (
                              <p className="text-sm text-slate-500 mt-2">{bill.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePayBill(bill.id, bill)}
                              className="btn-primary flex items-center gap-2 px-4 py-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Pagar
                            </button>
                            <button
                              onClick={() => handleDeleteBill(bill.id)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {paidBills.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Pagas ({paidBills.length})
                  </h3>
                  {paidBills.map(bill => (
                    <div key={bill.id} className="card bg-slate-800/50 opacity-75">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-300">{bill.name}</h4>
                            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                              ✓ Pago
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            Pago em {new Date(bill.paid_at).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-lg font-bold text-slate-400">
                            {formatCurrency(bill.amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {bills.length === 0 && (
                <div className="card text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">Nenhuma conta cadastrada</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Conteúdo da aba ASSINATURAS */}
      {activeTab === 'subscriptions' && (
        <>
          {showSubscriptionForm && (
            <div className="card bg-slate-800 border-2 border-purple-600">
              <h3 className="text-lg font-semibold mb-4">Nova Assinatura</h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome (ex: Netflix, Spotify)"
                  value={subscriptionFormData.name}
                  onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, name: e.target.value })}
                  className="input-field w-full"
                />

                <input
                  type="number"
                  placeholder="Valor mensal (R$)"
                  value={subscriptionFormData.amount}
                  onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, amount: e.target.value })}
                  className="input-field w-full"
                  step="0.01"
                />

                <select
                  value={subscriptionFormData.card_id}
                  onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, card_id: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Selecione o cartão</option>
                  {cards?.map(card => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Dia de cobrança (1-31)"
                  value={subscriptionFormData.billing_day}
                  onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, billing_day: e.target.value })}
                  className="input-field w-full"
                  min="1"
                  max="31"
                />

                <select
                  value={subscriptionFormData.category_id}
                  onChange={(e) => setSubscriptionFormData({ ...subscriptionFormData, category_id: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Categoria (opcional)</option>
                  {expenseCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400">
                  💡 A cobrança será automática todo dia {subscriptionFormData.billing_day} de cada mês no cartão selecionado
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={handleSubscriptionSubmit} 
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowSubscriptionForm(false)
                      setMessage('')
                    }} 
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {loadingSubscriptions ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-slate-300">Carregando assinaturas...</p>
            </div>
          ) : (
            <>
              {activeSubscriptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Power className="w-5 h-5 text-green-400" />
                    Ativas ({activeSubscriptions.length})
                  </h3>
                  {activeSubscriptions.map(sub => (
                    <div key={sub.id} className="card border-l-4 border-green-500">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Repeat className="w-4 h-4 text-green-400" />
                            <h4 className="font-semibold text-white">{sub.name}</h4>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">
                            {sub.cards?.name} • Dia {sub.billing_day} de cada mês
                            {sub.categories?.name && ` • ${sub.categories.name}`}
                          </p>
                          <p className="text-lg font-bold text-white">
                            {formatCurrency(sub.amount)}/mês
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleSubscription(sub.id, sub.status)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition"
                            title="Desativar"
                          >
                            <PowerOff className="w-5 h-5 text-yellow-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inactiveSubscriptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <PowerOff className="w-5 h-5 text-slate-500" />
                    Inativas ({inactiveSubscriptions.length})
                  </h3>
                  {inactiveSubscriptions.map(sub => (
                    <div key={sub.id} className="card bg-slate-800/50 opacity-75">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-400">{sub.name}</h4>
                            <span className="text-xs px-2 py-1 bg-slate-500/20 text-slate-400 rounded">
                              Pausada
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {sub.cards?.name} • Dia {sub.billing_day}
                          </p>
                          <p className="text-lg font-bold text-slate-500">
                            {formatCurrency(sub.amount)}/mês
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleSubscription(sub.id, sub.status)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition"
                            title="Reativar"
                          >
                            <Power className="w-5 h-5 text-green-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {subscriptions.length === 0 && (
                <div className="card text-center py-12">
                  <Repeat className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400">Nenhuma assinatura cadastrada</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Cadastre suas assinaturas (Netflix, Spotify, etc) para cobrança automática
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default Transactions