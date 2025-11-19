import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

export const useCards = (userId) => {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return

    const fetchCards = async () => {
      try {
        const { data, error: err } = await supabase
          .from('cards')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (err) throw err
        setCards(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCards()

    const channel = supabase
      .channel('cards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `user_id=eq.${userId}` },
        () => fetchCards()
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [userId])

  const addCard = async (card) => {
    try {
      const { data, error: err } = await supabase
        .from('cards')
        .insert([{ ...card, user_id: userId }])
        .select()

      if (err) throw err
      setCards([...cards, data[0]])
      return { success: true, data: data[0] }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  return { cards, setCards, loading, error, addCard }
}