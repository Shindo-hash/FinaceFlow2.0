import { useState, useEffect } from 'react'
import { Plus, Trash2, Target } from 'lucide-react'
import { formatCurrency, checkPretensionStatus } from '../utils/formatting'
import { supabase } from '../utils/supabase'

const Metas = ({ user, categories, transactions }) => {
  const [metas, setMetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    category_id: '',
    amount: ''
  })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!user) return
    fetchMetas()
  }, [user])

  const fetchMetas = async () => {
    try {
      const { data } = await supabase
        .from('pretensions')
        .select('*, categories(name, color)')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)

      setMetas(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleAddMeta = async () => {
    if (!formData.category_id || !formData.amount) {
      alert('Preencha todos os campos')
      return
    }

    try {
      const { error } = await supabase
        .from('pretensions')
        .insert([
          {
            user_id: user.id,
            category_id: formData.category_id,
            amount: parseFloat(formData.amount),
            month: currentMonth,
            year: currentYear
          }
        ])

      if (error) throw error

      setFormData({ category_id: '', amount: '' })
      setShowForm(false)
      fetchMetas()
    } catch (err) {
      alert('Erro ao criar meta: ' + err.message)
    }
  }

  const handleDeleteMeta = async (id) => {
    try {
      const { error } = await supabase
        .from('pretensions')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchMetas()
    } catch (err) {
      alert('Erro ao deletar meta: ' + err.message)
    }
  }

  const getSpentInCategory = (categoryId) => {
    return transactions
      .filter(t => 
        t.category_id === categoryId &&
        t.type === 'expense' &&
        new Date(t.date).getMonth() === currentMonth - 1 &&
        new Date(t.date).getFullYear() === currentYear
      )
      .reduce((sum, t) => sum + t.amount, 0)
  }

  if (loading) {
    return <div className="text-center text-slate-400">Carregando metas...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Metas de Gasto</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Meta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card bg-slate-800 border-2 border-purple-600">
          <h3 className="text-lg font-semibold mb-4">Nova Meta</h3>
          
          <div className="space-y-4">
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

            <input
              type="number"
              placeholder="Limite de gasto (R$)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field w-full"
              step="0.01"
            />

            <div className="flex gap-2">
              <button onClick={handleAddMeta} className="btn-primary flex-1">Salvar</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Metas List */}
      <div className="space-y-4">
        {metas.length === 0 ? (
          <div className="card text-center py-12">
            <Target className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Nenhuma meta criada para este mês</p>
          </div>
        ) : (
          metas.map(meta => {
            const spent = getSpentInCategory(meta.category_id)
            const { status, percentage } = checkPretensionStatus(spent, meta.amount)
            const categoryColor = meta.categories?.color || '#8B5CF6'

            return (
              <div key={meta.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{meta.categories?.name}</h3>
                    <p className="text-sm text-slate-400">Meta: {formatCurrency(meta.amount)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMeta(meta.id)}
                    className="p-2 hover:bg-slate-800 rounded transition"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Gasto: {formatCurrency(spent)}</span>
                    <span className={`font-semibold ${
                      status === 'ok' ? 'text-green-400' :
                      status === 'warning' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        status === 'ok' ? 'bg-green-500' :
                        status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  {/* Status Badge */}
                  {status === 'warning' && (
                    <p className="text-sm text-yellow-400">⚠️ Você está perto do limite!</p>
                  )}
                  {status === 'exceeded' && (
                    <p className="text-sm text-red-400">🚨 Limite ultrapassado!</p>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Metas
