import { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, Eye, DollarSign } from 'lucide-react'
import { formatCurrency, getCardPercentageUsed, getPercentageColor } from '../utils/formatting'
import { supabase } from '../utils/supabase'
import InvoiceModal from './InvoiceModal'

const Cards = ({ cards, onAdd, onDelete, user }) => {
  console.log('🎯 Cards recebeu user:', user)
  
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [installments, setInstallments] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    limit_total: '',
    limit_used: 0,
    due_day: 15,
    closing_day: 1,
    color: '#8B5CF6'
  })

  // Carregar faturas quando abre modal
  useEffect(() => {
    if (selectedInvoice?.id) {
      fetchInvoiceDetails(selectedInvoice.id)
    }
  }, [selectedInvoice])

  const fetchInvoiceDetails = async (cardId) => {
    try {
      if (!cardId || !user?.id) {
        console.error('Card ID ou User ID ausentes', { cardId, userId: user?.id })
        return
      }

      console.log('📥 Buscando faturas para card:', cardId)

      const { data: inv, error: invError } = await supabase
        .from('invoices')
        .select('*')
        .eq('card_id', cardId)
        .order('month', { ascending: false })

      if (invError) throw invError

      // Buscar TODAS as parcelas deste cartão neste mês
      const { data: inst, error: instError } = await supabase
        .from('installments')
        .select('*, transaction:transactions(description), invoice:invoices(month, year)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (instError) throw instError

      console.log('✅ Faturas carregadas:', inv)
      console.log('✅ Parcelas carregadas:', inst)

      setInvoices(inv || [])
      setInstallments(inst || [])
    } catch (err) {
      console.error('❌ Erro ao carregar detalhes:', err)
    }
  }

  const handlePayInvoice = async (invoiceId) => {
    try {
      console.log('💳 Pagando fatura:', invoiceId)

      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)
        .select()

      if (error) {
        console.error('❌ Erro ao atualizar fatura:', error)
        throw error
      }

      console.log('✅ Fatura atualizada:', data)

      // Atualizar installments pra paid
      const { error: instError } = await supabase
        .from('installments')
        .update({ status: 'paid' })
        .eq('invoice_id', invoiceId)

      if (instError) {
        console.error('❌ Erro ao atualizar parcelas:', instError)
        throw instError
      }

      console.log('✅ Parcelas atualizadas para paga')

      // Recarregar dados
      if (selectedInvoice?.id) {
        fetchInvoiceDetails(selectedInvoice.id)
      }
    } catch (err) {
      console.error('❌ Erro completo:', err)
      throw err
    }
  }
  const handleSubmit = async () => {
    if (!formData.name || !formData.limit_total) {
      setMessage('❌ Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      await onAdd(formData)
      setMessage('✅ Cartão salvo com sucesso!')
      setFormData({
        name: '',
        number: '',
        limit_total: '',
        limit_used: 0,
        due_day: 15,
        closing_day: 1,
        color: '#8B5CF6'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cartões de Crédito</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novo Cartão
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card bg-slate-800 border-2 border-purple-600">
          <h3 className="text-lg font-semibold mb-4">Novo Cartão</h3>
          
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

            <input
              type="text"
              placeholder="Nome do Cartão (ex: Nubank, Inter...)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field w-full"
            />

            <input
              type="text"
              placeholder="Número (últimos 4 dígitos)"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="input-field w-full"
              maxLength="4"
            />

            <input
              type="number"
              placeholder="Limite (R$)"
              value={formData.limit_total}
              onChange={(e) => setFormData({ ...formData, limit_total: parseFloat(e.target.value) })}
              className="input-field w-full"
              step="100"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Dia de Fechamento"
                value={formData.closing_day}
                onChange={(e) => setFormData({ ...formData, closing_day: parseInt(e.target.value) })}
                className="input-field"
                min="1"
                max="31"
              />
              <input
                type="number"
                placeholder="Dia de Vencimento"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: parseInt(e.target.value) })}
                className="input-field"
                min="1"
                max="31"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10 rounded-lg cursor-pointer"
              />
              <span className="text-slate-400 text-sm self-center">Cor do cartão</span>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => {
                setShowForm(false)
                setMessage('')
              }} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards?.map(card => {
          const percentage = getCardPercentageUsed(card.limit_used || 0, card.limit_total)
          const colorClass = getPercentageColor(percentage)
          
          return (
            <div
              key={card.id}
              className="relative rounded-lg p-6 text-white overflow-hidden shadow-lg flex flex-col"
              style={{
                background: `linear-gradient(135deg, ${card.color}80 0%, ${card.color}40 100%)`,
                border: `2px solid ${card.color}`
              }}
            >
              {/* Padrão de fundo */}
              <div className="absolute top-0 right-0 opacity-10">
                <CreditCard className="w-32 h-32" />
              </div>

              {/* Conteúdo */}
              <div className="relative z-10 space-y-3 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{card.name}</h3>
                  <button
                    onClick={() => onDelete(card.id)}
                    className="p-1 hover:bg-white/20 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {card.number && (
                  <p className="text-sm font-mono">•••• •••• •••• {card.number}</p>
                )}

                {/* Limite */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Limite: {formatCurrency(card.limit_used || 0)} / {formatCurrency(card.limit_total)}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className={`${colorClass} h-full rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Datas */}
                <div className="text-xs space-y-1">
                  <p>Fechamento: {card.closing_day}º</p>
                  <p>Vencimento: {card.due_day}º</p>
                </div>

                {/* Botão Ver Fatura */}
                <button
                  onClick={() => setSelectedInvoice(card)}
                  className="w-full mt-3 pt-3 border-t border-white/20 bg-white/10 hover:bg-white/20 text-white text-sm py-1 rounded flex items-center justify-center gap-1 transition"
                >
                  <Eye className="w-3 h-3" />
                  Ver Fatura
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Fatura */}
      {selectedInvoice && invoices.length > 0 && (
        <InvoiceModal
          card={selectedInvoice}
          invoice={invoices.find(inv => inv.month === new Date().getMonth() + 1 && inv.year === new Date().getFullYear()) || invoices[0]}
          installments={installments}
          onClose={() => setSelectedInvoice(null)}
          onPayInvoice={handlePayInvoice}
        />
      )}
    </div>
  )
}

export default Cards
