import { useState, useEffect } from 'react'
import { LogOut, LayoutDashboard, CreditCard, TrendingUp, Bell, Menu, X, Target, Tag, Plus } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { useTransactions } from './hooks/useTransactions'
import { useCards } from './hooks/useCards'
import { supabase, signOut } from './utils/supabase'
import Login from './pages/Login'
import Dashboard from './components/Dashboard'
import Transactions from './components/Transactions'
import Cards from './components/Cards'
import Categories from './components/Categories'
import Metas from './components/Metas'
import Notifications from './pages/Notifications'
import SettingsPage from './pages/Settings'
import './styles.css'

function App() {
  const { user, loading: authLoading } = useAuth()
  const [categories, setCategories] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')

  const { transactions, loading: transLoading, addTransaction, deleteTransaction } = useTransactions(user?.id)
  const { cards, loading: cardsLoading, addCard } = useCards(user?.id)

  // Carregar categorias
  useEffect(() => {
    if (!user) return

    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      setCategories(data || [])
    }

    fetchCategories()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('categories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${user.id}` },
        () => fetchCategories()
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [user])

  const handleLogout = async () => {
    await signOut()
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-slate-300">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
        {/* Sidebar */}
        <div className={`fixed lg:static w-64 h-screen bg-slate-900 border-r border-slate-800 overflow-y-auto transition-all duration-300 z-40 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-6 space-y-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src="/icon.png" alt="FinanceFlow" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold">
                <span className="text-purple-500">Finance</span>
                <span className="text-pink-500">Flow</span>
              </h1>
            </div>

            {/* Navigation */}
            <nav className="space-y-3">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'transactions', label: 'Transações', icon: TrendingUp },
                { id: 'categories', label: 'Categorias', icon: Tag },
                { id: 'cards', label: 'Cartões', icon: CreditCard },
                { id: 'metas', label: 'Metas', icon: Target },
                { id: 'notifications', label: 'Alertas', icon: Bell },
                { id: 'settings', label: 'Configurações', icon: LayoutDashboard },
              ].map(item => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${
                      currentPage === item.id
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            {/* User Info */}
            <div className="border-t border-slate-800 pt-6">
              <div className="text-sm mb-4">
                <p className="text-slate-400">Conectado como</p>
                <p className="text-white font-medium truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {currentPage === 'dashboard' && 'Dashboard'}
              {currentPage === 'transactions' && 'Transações'}
              {currentPage === 'categories' && 'Categorias'}
              {currentPage === 'cards' && 'Cartões de Crédito'}
              {currentPage === 'metas' && 'Metas de Gasto'}
              {currentPage === 'notifications' && 'Notificações'}
              {currentPage === 'settings' && 'Configurações'}
            </h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-300" />
              ) : (
                <Menu className="w-6 h-6 text-slate-300" />
              )}
            </button>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {transLoading || cardsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-slate-300">Carregando dados...</p>
                </div>
              </div>
            ) : (
              <>
                {currentPage === 'dashboard' && (
                  <Dashboard transactions={transactions} cards={cards} user={user} />
                )}
                {currentPage === 'transactions' && (
                  <Transactions
                    transactions={transactions}
                    categories={categories}
                    cards={cards}
                    onAdd={addTransaction}
                    onDelete={deleteTransaction}
                  />
                )}
                {currentPage === 'categories' && (
                  <Categories user={user} onCategoriesUpdate={setCategories} />
                )}
                {currentPage === 'cards' && (
                  <Cards cards={cards} onAdd={addCard} onDelete={() => {}} user={user} />
                )}
                {currentPage === 'metas' && (
                  <Metas user={user} categories={categories} transactions={transactions} />
                )}
                {currentPage === 'notifications' && (
                  <Notifications user={user} />
                )}
                {currentPage === 'settings' && (
                  <SettingsPage user={user} />
                )}
              </>
            )}
          </div>
        </div>

        {/* Botão Flutuante */}
        {currentPage !== 'transactions' && (
          <button
            onClick={() => {
              setCurrentPage('transactions')
              setSidebarOpen(false)
            }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full p-4 shadow-lg transition transform hover:scale-110 z-20"
            title="Adicionar Transação"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Overlay do Sidebar Mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    )
}

export default App
