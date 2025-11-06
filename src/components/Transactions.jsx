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
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
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
                    max="12"
                  />
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
                disabled={loading}
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
