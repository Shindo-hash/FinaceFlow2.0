import { useState, useEffect } from 'react'
import { User, Lock, DollarSign, Trash2, LogOut } from 'lucide-react'
import { supabase, signOut } from '../utils/supabase'
import { formatDate } from '../utils/formatting'

export default function Settings({ user }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [editMode, setEditMode] = useState(false)

  // Profile Form
  const [profileData, setProfileData] = useState({
    full_name: '',
    first_name: '',
    phone: '',
    cpf: '',
    birth_date: ''
  })

  // Password Form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Banking Form
  const [bankingData, setBankingData] = useState({
    bank_name: '',
    account_number: '',
    account_type: 'checking'
  })

  useEffect(() => {
    if (!user) return
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setProfileData(data)
      }
    } catch (err) {
      console.log('Perfil não encontrado')
    }
  }

  const handleUpdateProfile = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id)

      if (error) throw error
      alert('✅ Perfil atualizado com sucesso!')
      setEditMode(false)
      fetchProfile()
    } catch (err) {
      alert('❌ Erro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Preencha todos os campos')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('As senhas não conferem!')
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error
      alert('✅ Senha alterada com sucesso!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      alert('❌ Erro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('⚠️ Tem certeza que deseja deletar sua conta? Esta ação é irreversível!')) return

    try {
      setLoading(true)
      // Deletar usuário
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      
      if (error) throw error
      alert('✅ Conta deletada com sucesso!')
      await signOut()
    } catch (err) {
      alert('❌ Erro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 bg-slate-800 p-2 rounded-lg">
        {[
          { id: 'profile', label: '👤 Perfil', icon: User },
          { id: 'password', label: '🔒 Senha', icon: Lock },
          { id: 'banking', label: '💰 Dados Bancários', icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Informações Pessoais</h3>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="btn-primary text-sm"
                >
                  Editar
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Email (readonly) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-slate-700 text-slate-400 rounded-lg px-4 py-3"
                />
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profileData.full_name || ''}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  disabled={!editMode}
                  className="input-field w-full disabled:bg-slate-700 disabled:text-slate-400"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={profileData.phone || ''}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!editMode}
                  className="input-field w-full disabled:bg-slate-700 disabled:text-slate-400"
                />
              </div>

              {/* CPF */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  CPF
                </label>
                <input
                  type="text"
                  value={profileData.cpf || ''}
                  onChange={(e) => setProfileData({ ...profileData, cpf: e.target.value })}
                  disabled={!editMode}
                  className="input-field w-full disabled:bg-slate-700 disabled:text-slate-400"
                />
              </div>

              {/* Data de Aniversário */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data de Aniversário
                </label>
                <input
                  type="date"
                  value={profileData.birth_date || ''}
                  onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                  disabled={!editMode}
                  className="input-field w-full disabled:bg-slate-700 disabled:text-slate-400"
                />
              </div>

              {/* Botões */}
              {editMode && (
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false)
                      setProfileData(profile || {})
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-6">Alterar Senha</h3>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="input-field w-full"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="btn-primary w-full mt-6"
            >
              {loading ? 'Atualizando...' : 'Alterar Senha'}
            </button>
          </div>
        </div>
      )}

      {/* Banking Tab */}
      {activeTab === 'banking' && (
        <div className="card">
          <h3 className="text-xl font-semibold mb-6">Dados Bancários (em breve)</h3>
          <p className="text-slate-400">
            Esta funcionalidade será ativada em breve para facilitar transferências e integrações bancárias.
          </p>
        </div>
      )}

      {/* Logout e Delete */}
      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sair da Conta
        </button>

        <button
          onClick={handleDeleteAccount}
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="w-5 h-5" />
          Deletar Conta
        </button>
      </div>
    </div>
  )
}
