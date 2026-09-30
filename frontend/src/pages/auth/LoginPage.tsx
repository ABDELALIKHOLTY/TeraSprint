import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Logo } from '../../components/ui/Logo';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:8000/api/v1/auth/google/login';
  };

  const handleGithubLogin = () => {
    window.location.href = 'http://localhost:8000/api/v1/auth/github/login';
  };

  const handleSendForgotOtp = async () => {
    if (!forgotEmail) {
      setForgotError('Veuillez entrer votre email');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur lors de l\'envoi');
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    if (forgotOtp.length !== 6) {
      setForgotError('Le code doit contenir 6 chiffres');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Code invalide');
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (forgotNewPassword.length < 8) {
      setForgotError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, new_password: forgotNewPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur');
      
      toast.success(t('settings.password_success') || 'Mot de passe réinitialisé avec succès !');
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotEmail('');
      setForgotOtp('');
      setForgotNewPassword('');
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-gray-200 relative overflow-hidden transition-colors duration-300">
      

      
      {/* Effets de lumière ambiante (Néons Cyan et Bleu) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-200/20 dark:bg-cyan-500/10 blur-[120px] animate-[pulse_8s_ease-in-out_infinite] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[30%] w-[30%] h-[30%] rounded-full bg-blue-200/20 dark:bg-blue-500/10 blur-[100px] animate-[pulse_10s_ease-in-out_infinite] pointer-events-none z-0" style={{ animationDelay: '2s' }}></div>

      {/* Left Column (Branding & Grid) */}
      <div className="hidden lg:flex lg:w-3/5 flex-col justify-between p-12 relative z-10">
        <div className="z-10">
          <Logo scale={1.2} />
        </div>
        
        <div className="z-10 my-auto">
          <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-700 to-gray-400 dark:from-gray-100 dark:to-gray-500 tracking-tighter leading-tight mb-6 drop-shadow-sm transition-colors duration-300">
            NEXT-GEN <br />
            PROJECT <br />
            MANAGEMENT
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md text-lg transition-colors duration-300">
            AI-powered development workflow. Replace manual declarations with evidence-based intelligence.
          </p>
        </div>
        
        <div className="z-10 text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center space-x-4">
          <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
          <span>© 2026 TERASPRINT - SECURE CONNECTION</span>
        </div>
      </div>

      {/* Right Column (Auth Form) */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 lg:py-0 overflow-y-auto bg-white/80 dark:bg-[#121214]/80 backdrop-blur-3xl border-l border-gray-200 dark:border-[#27272a] shadow-2xl dark:shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-10 relative transition-colors duration-300">
        <div className="hidden dark:block absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-50 pointer-events-none"></div>

        {/* Mobile Logo */}
        <div className="lg:hidden flex justify-center mb-8">
          <Logo scale={1.2} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.welcome')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('auth.welcome_desc')}</p>
        </div>

        {error ? (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm text-center transition-colors duration-300 animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        ) : (
          <div className="mb-6 h-[46px]"></div> // Placeholder to prevent layout shift
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('auth.email')}</label>
            <input
              type="email"
              required
              className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-200 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-400 dark:placeholder-gray-600 shadow-inner"
              placeholder="operator@terasprint.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('auth.password')}</label>
              <button 
                type="button" 
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setForgotError('');
                }}
                className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                {t('auth.forgot_password')}
              </button>
            </div>
            <input
              type="password"
              required
              className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-gray-200 px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors placeholder-gray-400 dark:placeholder-gray-600 shadow-inner"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? t('common.loading') : t('auth.login_btn')}
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-[#121214] text-gray-500 dark:text-gray-400">
                {t('auth.or_continue')}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full flex items-center justify-center space-x-2 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-[#27272a] hover:border-cyan-500/30 transition-all shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-semibold text-sm">Google</span>
            </button>
            <button
              onClick={handleGithubLogin}
              type="button"
              className="w-full flex items-center justify-center space-x-2 bg-[#24292F] hover:bg-[#1F2328] border border-transparent text-white px-4 py-3 rounded-xl transition-all shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="font-semibold text-sm">GitHub</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('auth.no_account')}{' '}
          <button 
            onClick={() => navigate('/register')}
            className="font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            {t('auth.register_btn')}
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('auth.forgot_password_title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {forgotStep === 1 && t('auth.forgot_step1')}
              {forgotStep === 2 && t('auth.forgot_step2')}
              {forgotStep === 3 && t('auth.forgot_step3')}
            </p>

            {forgotError && <p className="text-sm text-red-500 mb-4 p-2 bg-red-50 dark:bg-red-950/30 rounded">{forgotError}</p>}

            {forgotStep === 1 && (
              <div className="space-y-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSendForgotOtp}
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? t('auth.sending') : t('auth.send_otp')}
                </button>
              </div>
            )}

            {forgotStep === 2 && (
              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  value={forgotOtp}
                  onChange={e => setForgotOtp(e.target.value)}
                  placeholder="000000"
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 font-mono tracking-widest text-center text-xl"
                />
                <button
                  onClick={handleVerifyForgotOtp}
                  disabled={forgotLoading || forgotOtp.length !== 6}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? t('auth.verifying') : t('auth.verify_code')}
                </button>
              </div>
            )}

            {forgotStep === 3 && (
              <div className="space-y-4">
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={e => setForgotNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="w-full bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#27272a] text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleResetPassword}
                  disabled={forgotLoading || forgotNewPassword.length < 8}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? t('auth.modifying') : t('auth.modify_password')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
