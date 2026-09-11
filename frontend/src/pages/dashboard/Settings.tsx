import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Moon, Sun, Globe } from 'lucide-react';

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
  const { language, setLanguage } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'appearance'>('profile');
  
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const [mfaSetup, setMfaSetup] = useState<{ qr_code: string; secret: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSessions();
    }
  }, [activeTab]);

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
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la deconnexion.");
    }
  };

  const initMfaSetup = async () => {
    try {
      setMfaLoading(true);
      setMfaError('');
      const data = await apiCall('/auth/mfa/setup', 'POST', null, token);
      setMfaSetup(data);
    } catch (err: any) {
      setMfaError(err.message || 'Erreur lors de la configuration MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfa = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setMfaError("Le code doit contenir 6 chiffres.");
      return;
    }
    try {
      setMfaLoading(true);
      setMfaError('');
      await apiCall('/auth/mfa/verify', 'POST', { token: totpCode }, token);
      alert("MFA active avec succes ! Veuillez vous reconnecter ou recharger la page pour mettre a jour votre profil.");
      window.location.reload();
    } catch (err: any) {
      setMfaError(err.message || 'Code invalide.');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Parametres du compte</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Gerez vos informations personnelles et la securite de votre compte.</p>
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
            Profil
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'security'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Securite & 2FA
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-4 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'appearance'
                ? 'border-cyan-500 text-cyan-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Apparence & Langue
          </button>
        </div>

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Informations personnelles</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom complet</label>
                <input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-500 dark:text-gray-400 px-4 py-3 rounded-xl cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adresse Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-500 dark:text-gray-400 px-4 py-3 rounded-xl cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-gray-500">Pour modifier votre email, veuillez contacter le support.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30">
                  {user?.role || 'user'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* MFA Section */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Authentification a deux facteurs (2FA)</h2>
              </div>

              {user?.mfa_enabled ? (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center space-x-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Le 2FA est active sur votre compte. Votre compte est securise.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    L'authentification a deux facteurs ajoute une couche de securite supplementaire a votre compte en exigeant plus qu'un simple mot de passe pour vous connecter.
                  </p>
                  
                  {!mfaSetup ? (
                    <button
                      onClick={initMfaSetup}
                      disabled={mfaLoading}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                    >
                      {mfaLoading ? 'Generation...' : 'Activer le 2FA'}
                    </button>
                  ) : (
                    <div className="bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] rounded-xl p-6">
                      <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="bg-white p-2 rounded-xl">
                          <img src={mfaSetup.qr_code} alt="QR Code MFA" className="w-48 h-48" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white">1. Scannez le QR Code</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Utilisez Google Authenticator, Authy ou n'importe quelle application TOTP pour scanner ce code.
                          </p>
                          
                          <div className="pt-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">2. Entrez le code a 6 chiffres</h3>
                            <div className="flex space-x-3">
                              <input
                                type="text"
                                maxLength={6}
                                value={totpCode}
                                onChange={e => setTotpCode(e.target.value)}
                                placeholder="000000"
                                className="bg-white dark:bg-[#121214] border border-gray-300 dark:border-[#3f3f46] text-gray-900 dark:text-white px-4 py-2 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-lg tracking-widest w-32 text-center"
                              />
                              <button
                                onClick={verifyMfa}
                                disabled={mfaLoading || totpCode.length !== 6}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                              >
                                Verifier
                              </button>
                            </div>
                            {mfaError && <p className="text-red-500 text-sm mt-2">{mfaError}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sessions Actives</h2>
                </div>
                
                {sessions.length > 1 && (
                  <button
                    onClick={handleLogoutAll}
                    className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl font-medium text-sm transition-colors border border-red-500/20"
                  >
                    Deconnecter les autres appareils
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
                  <p className="text-gray-500 dark:text-gray-400">Aucune session trouvee.</p>
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
                              {session.user_agent ? session.user_agent.split(' ')[0] : 'Appareil Inconnu'}
                            </span>
                            {session.is_current && (
                              <span className="bg-cyan-500/10 text-cyan-500 text-xs px-2 py-0.5 rounded-full font-medium border border-cyan-500/20">
                                Appareil actuel
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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Theme de l'application</h2>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#1a1a1f]">
                <div className="flex items-center">
                  {theme === 'dark' ? <Moon className="w-6 h-6 mr-4 text-cyan-400" /> : <Sun className="w-6 h-6 mr-4 text-yellow-500" />}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {theme === 'dark' ? 'Mode Sombre' : 'Mode Clair'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ajuste l'apparence de TeraSprint</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-[#27272a] hover:bg-gray-100 dark:hover:bg-[#323236] transition-colors border border-gray-200 dark:border-[#3f3f46] text-gray-800 dark:text-gray-200"
                >
                  Basculer le theme
                </button>
              </div>
            </div>

            {/* Language Section */}
            <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Langue de l'interface</h2>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#1a1a1f]">
                <div className="flex items-center">
                  <Globe className="w-6 h-6 mr-4 text-cyan-500" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {language === 'fr' ? 'Francais' : 'English'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Langue des agents et de l'IDE</p>
                  </div>
                </div>
                <div className="flex space-x-2 bg-gray-200 dark:bg-[#27272a] p-1.5 rounded-xl">
                  <button
                    onClick={() => setLanguage('fr')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${language === 'fr' ? 'bg-white dark:bg-[#323236] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    Francais
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${language === 'en' ? 'bg-white dark:bg-[#323236] text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                  >
                    English
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
