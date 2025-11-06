import { useState } from 'react'
import { X, Calendar, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatting'

const InvoiceModal = ({ card, invoice, installments, onClose, onPayInvoice }) => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!card || !invoice) return null

  const invoiceInstallments = installments.filter(i => 
    i.invoice_id === invoice.id
  )
  
  const today = new Date()
  const closing = new Date(today.getFullYear(), today.getMonth(), card.closing_day)
  const dueDate = new Date(today.getFullYear(), today.getMonth(), card.due_day)
  
  const canPayInvoice = today >= closing && today <= dueDate

  const handlePayInvoice = async () => {
    setLoading(true)
    setMessage('')

    try {
      await onPayInvoice(invoice.id)
      setMessage('✅ Fatura paga com sucesso!')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setMessage('❌ Erro ao pagar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{card.name}</h2>
            <p className="text-slate-400">
              {new Date(2025, invoice.month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Vencimento</p>
              <p className="text-white font-semibold">{card.due_day}º do mês</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Total</p>
              <p className="text-white font-semibold">{formatCurrency(invoice.total)}</p>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Status</p>
              <p className={`font-semibold ${invoice.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                {invoice.status === 'paid' ? 'Paga' : 'Aberta'}
              </p>
            </div>
          </div>

          {/* Mensagem */}
          {message && (
            <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
              message.includes('✅') 
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}>
              {message}
            </div>
          )}

          {/* Compras */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Compras do Mês</h3>
            <div className="space-y-3">
              {invoiceInstallments.length > 0 ? (
                invoiceInstallments.map((installment) => (
                  <div
                    key={installment.id}
                    className="bg-slate-800 p-4 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {installment.transaction?.description || 'Transação'}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Parcela {installment.installment_number}/{installment.total_installments}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {formatCurrency(installment.amount)}
                      </p>
                      <p className={`text-sm ${installment.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {installment.status === 'paid' ? '✅ Paga' : '⏳ Pendente'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-8">Nenhuma compra neste mês</p>
              )}
            </div>
          </div>

          {/* Total */}
          <div className="bg-purple-600/20 border border-purple-500/50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total da Fatura</span>
              <span className="text-2xl font-bold text-purple-400">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Fechar
            </button>
            {canPayInvoice && invoice.status !== 'paid' && (
              <button
                onClick={handlePayInvoice}
                disabled={loading}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-base font-semibold"
              >
                {loading ? 'Processando...' : 'Pagar Fatura'}
              </button>
            )}
          </div>

          {canPayInvoice && invoice.status === 'paid' && (
            <p className="text-center text-green-400 text-sm">✅ Fatura já foi paga</p>
          )}
          
          {!canPayInvoice && (
            <p className="text-center text-slate-400 text-sm">
              Botão de pagamento disponível entre {card.closing_day}º e {card.due_day}º
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvoiceModal
