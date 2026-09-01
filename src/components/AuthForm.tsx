import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Mail, Lock, User, Briefcase, Eye, EyeOff, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { BahiaPrevLogo } from './BahiaPrevLogo';

// Helper to set cookie safely
const setCookie = (name: string, value: string, days: number) => {
  try {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    // SameSite=Lax is better suited for standard iframe previews, let's include fallback
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax; Secure";
  } catch (e) {
    console.warn("Cookies are restricted, falling back to local storage.", e);
  }
};

// Helper to get cookie safely
const getCookie = (name: string) => {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  } catch (e) {
    console.warn("Could not read cookie:", e);
  }
  return null;
};

// Helper to erase cookie safely
const eraseCookie = (name: string) => {
  try {
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax; Secure';
  } catch (e) {
    console.warn("Could not erase cookie:", e);
  }
};

export const AuthForm: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load remembered credentials on component mount only if user explicitly saved
  useEffect(() => {
    const savedRemember = getCookie('remember_me_preference') || localStorage.getItem('remember_me_preference');
    if (savedRemember === 'true') {
      const savedEmail = getCookie('remembered_email') || localStorage.getItem('remembered_email') || '';
      const savedPassword = getCookie('remembered_password') || localStorage.getItem('remembered_password') || '';
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    try {
      await login(email, password);

      // Save or erase credentials based on selection
      if (rememberMe) {
        setCookie('remembered_email', email, 30);
        setCookie('remembered_password', password, 30);
        setCookie('remember_me_preference', 'true', 30);
        
        localStorage.setItem('remembered_email', email);
        localStorage.setItem('remembered_password', password);
        localStorage.setItem('remember_me_preference', 'true');
      } else {
        eraseCookie('remembered_email');
        eraseCookie('remembered_password');
        setCookie('remember_me_preference', 'false', 30);
        
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_password');
        localStorage.setItem('remember_me_preference', 'false');
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = err?.message || 'Ocorreu um erro ao processar seu login.';
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyError = 'E-mail ou senha incorretos. Verifique suas credenciais.';
      } else if (err.code === 'auth/user-not-found') {
        friendlyError = 'Usuário não cadastrado no sistema.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'O e-mail inserido é inválido.';
      }
      
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden">
      {/* Visual background details to match Bahia Prev style */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-40" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Animated Bahia Prev Logo */}
        <div className="flex justify-center mb-6">
          <BahiaPrevLogo className="h-24 drop-shadow-md" />
        </div>
        
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
          Entrar no Portal
        </h2>
        
        <p className="mt-2 text-center text-sm text-slate-600 max-w">
          Acesso restrito para colaboradores autorizados
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          layout
          transition={{ duration: 0.3 }}
          className="bg-white py-8 px-4 shadow-xl border border-slate-200/60 rounded-2xl sm:px-10"
        >
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200/60 text-red-700 text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                E-mail Corporativo
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seuemail@bahiaprev.com.br"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Senha
                </label>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center pt-0.5 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-200 bg-slate-50 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
                />
                <span className="text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors">
                  Lembrar meus dados de acesso
                </span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white tracking-wide bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/15 focus:outline-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Acessar Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-start gap-2.5 text-slate-500 text-[11px] sm:text-xs leading-relaxed">
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              Faça login para ter acesso aos canais de benefícios, contatos rápidos, materiais promocionais e mídias de apoio.
            </p>
          </div>
        </motion.div>

        {/* Corporate branding badge */}
        <div className="mt-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>Bahia Prev • Portal de Apoio Empresarial</span>
        </div>
      </div>
    </div>
  );
};
