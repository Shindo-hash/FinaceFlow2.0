import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, DollarSign, Calendar, Clock } from 'lucide-react'
import { formatCurrency } from '../utils/formatting'

const InvoiceModal = ({ card, invoices, installments, onClose, onPayInvoice }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [currentInvoice, setCurrentInvoice] = useState(null)
  const [canPayInvoice, setCanPayInvoice] = useState(false)

  // Atualizar fatura atual quando muda mês/ano
  useEffect(() => {
    const invoice = invoices.find(
      inv => inv.month === selectedMonth && inv.year === selectedYear
    )
    setCurrentInvoice(invoice || null)
  }, [selectedMonth, selectedYear, invoices])

  // Verificar se pode mostrar botão de pagamento
  useEffect(() => {
    if (!currentInvoice) {
      setCanPayInvoice(false)
      return
    }

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear()

    // Só pode pagar se for a fatura do mês atual
    if (currentInvoice.month !== currentMonth || currentInvoice.year !== currentYear) {
      setCanPayInvoice(false)
      return
    }

    // Verifica se está entre fechamento e vencimento
    const closingDay = card.closing_day
    const dueDay = card.due_day

    // Caso 1: Fechamento antes do vencimento no mesmo mês (ex: fecha dia 5, vence dia 15)
    if (closingDay < dueDay) {
      setCanPayInvoice(currentDay >= closingDay && currentDay <= dueDay)
    } 
    // Caso 2: Fechamento depois do vencimento (ex: fecha dia 25, vence dia 10 do mês seguinte)
    else {
      setCanPayInvoice(currentDay >= closingDay || currentDay <= dueDay)
    }
  }, [currentInvoice, card.closing_day, card.due_day])

  // Navegar entre meses
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // Filtrar parcelas desta fatura
  const invoiceInstallments = installments.filter(
    inst => inst.invoice_id === currentInvoice?.id
  )

  // Calcular total da fatura
  const invoiceTotal = currentInvoice?.total || 0

  // Status da fatura
  const isPaid = currentInvoice?.status === 'paid'
  const isPending = currentInvoice?.status === 'pending'

  // Meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const handlePayment = async () => {
    if (!currentInvoice) return
    
    const confirmed = window.confirm(
      `Confirma o pagamento da fatura de ${formatCurrency(invoiceTotal)}?`
    )
    
    if (confirmed) {
      try {
        await onPayInvoice(currentInvoice.id)
        alert('✅ Fatura paga com sucesso! Limite liberado.')
      } catch (err) {
        alert('❌ Erro ao pagar fatura: ' + err.message)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{card.name}</h2>
            <p className="text-slate-400 text-sm">•••• •••• •••• {card.number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Navegação de Meses */}
        <div className="p-4 bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-white">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </h3>
            {currentInvoice && (
              <span className={`text-xs px-3 py-1 rounded-full inline-block mt-1 ${
                isPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {isPaid ? '✅ Paga' : '⏳ Pendente'}
              </span>
            )}
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {!currentInvoice ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nenhuma fatura registrada para este mês</p>
            </div>
          ) : (
            <>
              {/* Resumo da Fatura */}
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fechamento
                  </span>
                  <span className="text-white font-semibold">
                    {card.closing_day}/{selectedMonth.toString().padStart(2, '0')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Vencimento
                  </span>
                  <span className="text-white font-semibold">
                    {card.due_day}/{selectedMonth.toString().padStart(2, '0')}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total da Fatura
                    </span>
                    <span className="text-2xl font-bold text-white">
                      {formatCurrency(invoiceTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Parcelas */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-3">
                  Parcelas ({invoiceInstallments.length})
                </h4>
                
                {invoiceInstallments.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">
                    Nenhuma parcela nesta fatura
                  </p>
                ) : (
                  <div className="space-y-2">
                    {invoiceInstallments.map((inst) => (
                      <div
                        key={inst.id}
                        className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {inst.transaction?.description || 'Compra'}
                          </p>
                          <p className="text-slate-400 text-xs">
                            Parcela {inst.installment_number}/{inst.total_installments}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatCurrency(inst.amount)}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            inst.status === 'paid' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {inst.status === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer - Botão de Pagamento */}
        {currentInvoice && isPending && canPayInvoice && (
          <div className="p-6 border-t border-slate-700 bg-slate-900/50">
            <button
              onClick={handlePayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              Pagar Fatura - {formatCurrency(invoiceTotal)}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Disponível apenas entre o dia {card.closing_day} e {card.due_day}
            </p>
          </div>
        )}

        {currentInvoice && isPaid && (
          <div className="p-6 border-t border-slate-700 bg-green-500/10">
            <p className="text-center text-green-400 font-semibold">
              ✅ Fatura paga em {new Date(currentInvoice.paid_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvoiceModal
