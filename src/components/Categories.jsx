import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Tag } from 'lucide-react'
import { supabase } from '../utils/supabase'

const Categories = ({ user, onCategoriesUpdate }) => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    icon: 'tag',
    color: '#8B5CF6',
    type: 'expense'
  })

  const icons = ['tag', 'shopping-cart', 'utensils', 'car', 'home', 'heart', 'book', 'gamepad2', 'dumbbell', 'plane']
  const colors = ['#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6']

  useEffect(() => {
    if (!user) return
    fetchCategories()
  }, [user])

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      setCategories(data || [])
      onCategoriesUpdate?.(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!formData.name) {
      alert('Preencha o nome da categoria')
      return
    }

    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingId)

        if (error) throw error
        setEditingId(null)
      } else {
        // INSERT
        const { error } = await supabase
          .from('categories')
          .insert([
            {
              ...formData,
              user_id: user.id
            }
          ])

        if (error) throw error
      }

      setFormData({ name: '', icon: 'tag', color: '#8B5CF6', type: 'expense' })
      setShowForm(false)
      fetchCategories()
    } catch (err) {
      alert('Erro: ' + err.message)
    }
  }

  const handleEditCategory = (category) => {
    setFormData(category)
    setEditingId(category.id)
    setShowForm(true)
  }

  const handleDeleteCategory = async (id) => {
    if (!confirm('Tem certeza que deseja deletar esta categoria?')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchCategories()
    } catch (err) {
      alert('Erro ao deletar: ' + err.message)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Carregando categorias...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Categorias</h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({ name: '', icon: 'tag', color: '#8B5CF6', type: 'expense' })
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nova Categoria
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card bg-slate-800 border-2 border-purple-600 space-y-4">
          <h3 className="text-lg font-semibold">{editingId ? 'Editar' : 'Nova'} Categoria</h3>

          {/* Nome */}
          <input
            type="text"
            placeholder="Nome da categoria (ex: Lazer)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input-field w-full"
          />

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input-field w-full"
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </div>

          {/* Ícone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ícone</label>
            <div className="grid grid-cols-5 gap-2">
              {icons.map(icon => (
                <button
                  key={icon}
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`p-3 rounded-lg border-2 transition ${
                    formData.icon === icon
                      ? 'bg-purple-600 border-purple-400'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                  title={icon}
                >
                  <Tag className="w-5 h-5 mx-auto text-white" />
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition ${
                    formData.color === color ? 'border-white' : 'border-slate-600'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <button onClick={handleAddCategory} className="btn-primary flex-1">
              {editingId ? 'Atualizar' : 'Criar'}
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setFormData({ name: '', icon: 'tag', color: '#8B5CF6', type: 'expense' })
              }}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Tag className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Nenhuma categoria criada</p>
          </div>
        ) : (
          categories.map(category => (
            <div
              key={category.id}
              className="card flex items-start justify-between"
              style={{ borderLeftColor: category.color, borderLeftWidth: '4px' }}
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                <p className="text-sm text-slate-400">
                  {category.type === 'expense' ? '💸 Despesa' : '💰 Receita'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditCategory(category)}
                  className="p-2 hover:bg-slate-700 rounded transition"
                >
                  <Edit2 className="w-5 h-5 text-blue-400" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="p-2 hover:bg-slate-700 rounded transition"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Categories
