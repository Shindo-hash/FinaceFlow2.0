import { useState, useEffect } from 'react'
import { Bell, Trash2, CheckCircle } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDate } from '../utils/formatting'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

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
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [user])

  const markAsRead = async (id) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
  }

  const deleteNotification = async (id) => {
    await supabase
      .from('notifications')
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
              <h3 className="font-semibold text-white">{notif.title}</h3>
              <p className="text-slate-400 text-sm mt-1">{notif.message}</p>
              <p className="text-slate-500 text-xs mt-2">
                {new Date(notif.created_at).toLocaleDateString('pt-BR')}
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
