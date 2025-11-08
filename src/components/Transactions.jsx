import { useState } from 'react'
import { Plus, Trash2, Filter } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatting'

const Transactions = ({ transactions, categories, cards, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category_id: '',
    card_id: '',
    date: new Date().toISOString().split('T')[0],
    installments: '1'
  })

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

    // ✅ VALIDAÇÃO DE LIMITE DO CARTÃO
    if (formData.card_id) {
      const selectedCard = cards.find(c => c.id === formData.card_id)
      
      if (selectedCard) {
        const totalCompra = parseFloat(formData.amount) * parseInt(formData.installments || 1)
        const limiteDisponivel = selectedCard.limit_total - (selectedCard.limit_used || 0)
        
        if (totalCompra > limiteDisponivel) {
          setMessage(
            `❌ Limite insuficiente! ` +
            `Você precisa de ${formatCurrency(totalCompra)} mas tem apenas ${formatCurrency(limiteDisponivel)} disponível. ` +
            `(Limite usado: ${formatCurrency(selectedCard.limit_used || 0)} de ${formatCurrency(selectedCard.limit_total)})`
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

  const filtered = transactions.filter(t => {
    if (filter === 'all') return true
    return t.type === filter
  })

  // Calcular preview do limite ao digitar
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transações</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Adicionar
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card bg-slate-800 border-2 border-purple-600">
          <h3 className="text-lg font-semibold mb-4">Nova Transação</h3>
          
          <div className="space-y-4">
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                message.includes('✅') 
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
              }`}>
                {message}
              </div>
            )}

            {/* Tipo */}
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

            {/* Descrição */}
            <input
              type="text"
              placeholder="Descrição"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-field w-full"
            />

            {/* Valor */}
            <input
              type="number"
              placeholder="Valor (R$)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field w-full"
              step="0.01"
            />

            {/* Categoria */}
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="input-field w-full"
            >
              <option value="">Selecione uma categoria</option>
              {categories?.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Cartão (se despesa) */}
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

                {/* Parcelamento */}
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

                {/* Preview do Limite */}
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
                        {parseInt(formData.installments) > 1 && (
                          <span className="text-slate-400"> ({formData.installments}x de {formatCurrency(parseFloat(formData.amount))})</span>
                        )}
                      </p>
                      <p className="text-slate-300">
                        Limite disponível: <span className="font-semibold">{formatCurrency(limitPreview.limiteDisponivel)}</span>
                      </p>
                      <p className={limitPreview.suficiente ? 'text-blue-400' : 'text-red-400'}>
                        Novo limite usado: <span className="font-semibold">{formatCurrency(limitPreview.novoLimite)}</span> de {formatCurrency(limitPreview.limiteTotal)} ({limitPreview.percentual}%)
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Data */}
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input-field w-full"
            />

            {/* Botões */}
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

      {/* Filter */}
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

      {/* List */}
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
    </div>
  )
}

export default Transactions
