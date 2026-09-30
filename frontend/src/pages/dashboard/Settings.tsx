import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Moon, Sun, Globe, Upload, Loader2, Check, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface SessionInfo {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  is_current: boolean;
}

export const Settings: React.FC = () => {
  const { user, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');
  
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // Profile state
  const { updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab]);

  const handleSaveProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await apiCall('/users/profile', 'PUT', {
        first_name: firstName,
        last_name: lastName
      }, token);
      
      if (res && res.user) {
        updateUser(res.user);
      }
      toast.success(t('common.save') + " !");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de la mise a jour du profil");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSendOtp = async () => {
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError('');
      await apiCall('/auth/send-otp', 'POST', null, token);
      setOtpSent(true);
      toast.success("Code OTP envoyé à votre adresse email !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de l'OTP");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdatePasswordStandard = async () => {
    if (!currentPassword) {
      setPasswordError('Veuillez entrer votre ancien mot de passe.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError('');
      setPasswordSuccess(false);
      await apiCall('/auth/password/standard', 'PUT', { current_password: currentPassword, new_password: newPassword }, token);
      setPasswordSuccess(true);
      setNewPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setPasswordError('Veuillez entrer le code OTP à 6 chiffres.');
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError('');
      setPasswordSuccess(false);
      await apiCall('/auth/password', 'PUT', { new_password: newPassword, otp: otpCode }, token);
      setPasswordSuccess(true);
      setNewPassword('');
      setOtpCode('');
      setOtpSent(false);
    } catch (err: any) {
      setPasswordError(err.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('http://localhost:8000/api/v1/users/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      if (data && data.avatar_url) {
        updateUser({ avatar_url: data.avatar_url });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du telechargement de l'avatar");
    } finally {
      setUploading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await apiCall('/auth/sessions', 'GET', null, token);
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("Etes-vous sur de vouloir deconnecter tous vos autres appareils ?")) return;
    try {
      await apiCall('/auth/sessions/logout_all', 'POST', null, token);
      fetchSessions();
      toast.success("Sessions déconnectées avec succès.");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la deconnexion.");
    }
  };

  return (
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t('settings.subtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-[#27272a]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('settings.profile')}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'security'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('settings.security')}
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'appearance'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('settings.appearance')}
          </button>
        </div>

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.personal_info')}</h2>
            
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#27272a] shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-gray-400">
                      {user?.first_name ? user.first_name.charAt(0).toUpperCase() : user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-full text-white cursor-pointer transition-colors"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
              </div>
              <div className="mt-4 text-center">
                <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.name}
                </h4>
                <p className="text-sm text-cyan-600 dark:text-cyan-400 font-mono mt-1">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-6 max-w-lg mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.firstname')}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.lastname')}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                    placeholder="Votre nom..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.email')}</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f]/50 border border-gray-200 dark:border-[#27272a] text-gray-500 dark:text-gray-400 px-4 py-3 rounded-xl cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-gray-500">{t('settings.email_desc')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.role')}</label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
                  {user?.role || 'user'}
                </span>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveProfile}
                  disabled={loadingProfile}
                  className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{t('common.save_changes')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Password Section */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                    <Key className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.password_title')}</h2>
                </div>
              </div>
              <div className="max-w-lg space-y-4">
                
                {!useOtp && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.old_password')}</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-cyan-500 transition-colors"
                      >
                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.new_password')}</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-cyan-500 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('settings.password_desc')}</p>
                </div>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-green-500">{t('settings.password_success')}</p>}
                
                {!useOtp ? (
                  <div className="space-y-4">
                    <button
                      onClick={handleUpdatePasswordStandard}
                      disabled={passwordLoading || !newPassword || !currentPassword}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                      {passwordLoading ? t('common.loading') : t('settings.modify_password')}
                    </button>
                    <div className="pt-2">
                      <button
                        onClick={() => { setUseOtp(true); setPasswordError(''); setPasswordSuccess(false); }}
                        className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                      >
                        {t('settings.forgot_old_password')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {!otpSent ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('settings.otp_info')}
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleSendOtp}
                            disabled={passwordLoading || !newPassword || newPassword.length < 8}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {passwordLoading ? t('common.loading') : t('settings.send_otp')}
                          </button>
                          <button
                            onClick={() => { setUseOtp(false); setOtpSent(false); }}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 text-sm font-medium"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-[#27272a]">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.otp_code_label')}</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-mono tracking-widest text-lg"
                            placeholder="000000"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleUpdatePassword}
                            disabled={passwordLoading || otpCode.length !== 6}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {passwordLoading ? t('settings.verifying') : t('settings.confirm_modify')}
                          </button>
                          <button
                            onClick={() => { setUseOtp(false); setOtpSent(false); }}
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 text-sm font-medium"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {/* Active Sessions Section */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('settings.active_sessions')}</h2>
                </div>
                
                {sessions.length > 1 && (
                  <button
                    onClick={handleLogoutAll}
                    className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl font-medium text-sm transition-colors border border-red-500/20"
                  >
                    {t('settings.logout_others')}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {loadingSessions ? (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">{t('settings.no_sessions')}</p>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-xl hover:border-gray-300 dark:hover:border-[#3f3f46] transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="text-gray-400">
                          {session.user_agent?.toLowerCase().includes('mobile') ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                              {session.user_agent ? session.user_agent.split(' ')[0] : t('settings.unknown_device')}
                            </span>
                            {session.is_current && (
                              <span className="bg-cyan-500/10 text-cyan-500 text-xs px-2 py-0.5 rounded-full font-medium border border-cyan-500/20">
                                {t('settings.current_device')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2 mt-1">
                            <span>{session.ip_address || 'IP Inconnue'}</span>
                            <span> </span>
                            <span>{new Date(session.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* APPEARANCE TAB */}
        {activeTab === 'appearance' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Theme Section */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.app_theme')}</h2>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#1a1a1f]">
                <div className="flex items-center">
                  {theme === 'dark' ? <Moon className="w-6 h-6 mr-4 text-cyan-400" /> : <Sun className="w-6 h-6 mr-4 text-yellow-500" />}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {theme === 'dark' ? t('settings.dark_mode') : t('settings.light_mode')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.dark_mode_desc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-[#27272a] hover:bg-gray-100 dark:hover:bg-[#323236] transition-colors border border-gray-200 dark:border-[#3f3f46] text-gray-800 dark:text-gray-200"
                >
                  {t('settings.toggle_theme')}
                </button>
              </div>
            </div>

            {/* Language Section */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{t('settings.ui_language')}</h2>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#1a1a1f]">
                <div className="flex items-center">
                  <Globe className="w-6 h-6 mr-4 text-cyan-500" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {language === 'fr' ? t('settings.french') : t('settings.english')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.lang_desc')}</p>
                  </div>
                </div>
                <div className="flex space-x-2 bg-gray-200 dark:bg-[#27272a] p-1.5 rounded-xl">
                  <button
                    onClick={() => setLanguage('fr')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${language === 'fr' ? 'bg-white dark:bg-[#323236] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    {t('settings.french')}
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${language === 'en' ? 'bg-white dark:bg-[#323236] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    {t('settings.english')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
