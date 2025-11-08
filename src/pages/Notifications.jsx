import { useState, useEffect } from 'react'
import { Bell, Trash2, CheckCircle } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('invoice_notifications')  // ← CORRIGIDO AQUI
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Erro ao buscar notificações:', error)
        }

        setNotifications(data || [])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Subscribe to real-time
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoice_notifications', filter: `user_id=eq.${user.id}` }  // ← CORRIGIDO AQUI
        ,
        () => fetchNotifications()
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [user])

  const markAsRead = async (id) => {
    await supabase
      .from('invoice_notifications')  // ← CORRIGIDO AQUI
      .update({ read: true })
      .eq('id', id)
    
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteNotification = async (id) => {
    await supabase
      .from('invoice_notifications')  // ← CORRIGIDO AQUI
      .delete()
      .eq('id', id)
    
    setNotifications(notifications.filter(n => n.id !== id))
  }

  // Função para pegar o estilo de cada tipo
  const getNotificationStyle = (type) => {
    switch(type) {
      case 'closing':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🔔', label: 'Fechamento' }
      case 'payment_reminder':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⏰', label: 'Lembrete' }
      case 'limit_warning':
        return { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '⚠️', label: 'Alerta de Limite' }
      case 'paid':
        return { bg: 'bg-green-500/20', text: 'text-green-400', icon: '✅', label: 'Pago' }
      default:
        return { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: '📌', label: 'Notificação' }
    }
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
        notifications.map(notif => {
          const style = getNotificationStyle(notif.notification_type)
          
          return (
            <div
              key={notif.id}
              className={`card flex items-start justify-between gap-4 ${
                notif.read ? 'bg-slate-800/50' : 'bg-slate-800 border-l-4 border-purple-600'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">Notificação</h3>
                  <span className={`text-xs px-2 py-1 rounded ${style.bg} ${style.text}`}>
                    {style.icon} {style.label}
                  </span>
                  {!notif.read && (
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
                  )}
                </div>
                <p className="text-slate-300 text-sm mt-2">{notif.message}</p>
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
          )
        })
      )}
    </div>
  )
}
