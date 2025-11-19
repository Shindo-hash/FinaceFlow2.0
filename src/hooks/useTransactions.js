import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export const useTransactions = (userId) => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return

    const fetchTransactions = async () => {
      try {
        const { data, error: err } = await supabase
          .from('transactions')
          .select('*, categories(name, icon), cards(name)')
          .eq('user_id', userId)
          .order('date', { ascending: false })

        if (err) throw err
        setTransactions(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()

    const channel = supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => fetchTransactions()
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [userId])

  const addTransaction = async (transaction) => {
    try {
      console.log('📤 Enviando transação:', transaction)
      
      // Garantir que os valores estão corretos
      const transactionData = {
        user_id: userId,
        description: transaction.description,
        amount: parseFloat(transaction.amount),
        type: transaction.type,
        category_id: transaction.category_id || null,
        card_id: transaction.card_id || null,
        date: transaction.date,
        installments: parseInt(transaction.installments) || 1,
        status: 'pending'
      }

      console.log('📦 Dados processados:', transactionData)
      
      const { data, error: err } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select('*, categories(name, icon), cards(name)')

      if (err) {
        console.error('❌ Erro ao inserir:', err)
        throw err
      }
      
      console.log('✅ Transação criada:', data[0])
      
      // Aguardar um pouco para garantir que o trigger rodou
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Recarregar transações do banco
      const { data: allTransactions, error: fetchErr } = await supabase
        .from('transactions')
        .select('*, categories(name, icon), cards(name)')
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (fetchErr) {
        console.error('❌ Erro ao recarregar:', fetchErr)
      } else {
        setTransactions(allTransactions || [])
        console.log('✅ Transações recarregadas:', allTransactions.length)
      }
      
      return { success: true, data: data[0] }
    } catch (err) {
      console.error('❌ Erro completo:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteTransaction = async (id) => {
    try {
      const { error: err } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (err) throw err
      setTransactions(transactions.filter(t => t.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  return { transactions, loading, error, addTransaction, deleteTransaction }
}
