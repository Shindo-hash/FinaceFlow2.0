import { useState, useEffect } from 'react'
import { Bell, Trash2, CheckCircle } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Notifications({ user: userProp }) {
  const { user: userAuth } = useAuth()
  const user = userProp || userAuth
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  console.log('🔍 Notifications - user:', user)

  useEffect(() => {
    console.log('⚡ useEffect rodou, user:', user)
    
    if (!user) {
      console.log('⚠️ User é null, retornando')
      setLoading(false)
      return
    }

    const fetchNotifications = async () => {
      try {
        console.log('📥 Buscando notificações para:', user.id)
        
        const { data, error } = await supabase
          .from('invoice_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Erro ao buscar notificações:', error)
          return
        }

        console.log('✅ Notificações carregadas:', data)
        setNotifications(data || [])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Subscribe to real-time
    const channel = supabase
      .channel('invoice_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [user])

  const markAsRead = async (id) => {
    await supabase
      .from('invoice_notifications')
      .update({ read: true })
      .eq('id', id)
  }

  const deleteNotification = async (id) => {
    await supabase
      .from('invoice_notifications')
      .delete()
      .eq('id', id)
  }

  if (loading) {
    return <div className="text-center text-slate-400">Carregando notificações...</div>
  }

  return (
    <div className="space-y-4">
      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">Nenhuma notificação no momento</p>
        </div>
      ) : (
        notifications.map(notif => (
          <div
            key={notif.id}
            className={`card flex items-start justify-between gap-4 ${
              notif.read ? 'bg-slate-800/50' : 'bg-slate-800 border-l-4 border-purple-600'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">
                  Notificação de Fatura
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  notif.notification_type === 'closing' ? 'bg-blue-500/20 text-blue-400' :
                  notif.notification_type === 'payment_reminder' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {notif.notification_type === 'closing' ? '📋 Fechamento' :
                   notif.notification_type === 'payment_reminder' ? '⏰ Lembrete' :
                   '✅ Pago'}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">{notif.message}</p>
              <p className="text-slate-500 text-xs mt-2">
                {new Date(notif.created_at).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="flex gap-2">
              {!notif.read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="p-2 hover:bg-slate-700 rounded transition"
                  title="Marcar como lida"
                >
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </button>
              )}
              <button
                onClick={() => deleteNotification(notif.id)}
                className="p-2 hover:bg-slate-700 rounded transition"
                title="Deletar"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
