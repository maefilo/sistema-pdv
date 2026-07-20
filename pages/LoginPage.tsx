import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/Button';
import { 
  Layers, 
  Lock, 
  ShieldCheck,
  HelpCircle,
  Apple,
  ChevronRight
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, companyInfo } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const success = await login(email, password);
    if (success) {
      navigate('/', { replace: true });
    } else {
      setError('E-mail ou senha inválidos.');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row font-sans text-gray-900 overflow-hidden bg-white relative">
      {/* Top Header - Floating */}
      <div className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-30 pointer-events-none">
        <div className="font-bold text-sm tracking-[0.3em] uppercase opacity-40">{companyInfo.name || 'MÃE & FILHO CONFECÇÃO'}</div>
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 text-gray-400 p-2 rounded-full cursor-pointer hover:bg-indigo-600 hover:text-white transition-all pointer-events-auto">
          <HelpCircle size={16} />
        </div>
      </div>

      {/* Left Panel: Fixed/Static Branding - Transitions from full to 40% */}
      <div className={`transition-all duration-1000 ease-in-out flex flex-col justify-center relative overflow-hidden h-screen bg-[#F8F9FF] ${showForm ? 'w-full md:w-[40%]' : 'w-full'}`}>
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>

        <div className={`relative z-10 transition-all duration-1000 p-8 md:p-16 ${showForm ? 'max-w-md mx-auto md:mx-0' : 'max-w-3xl mx-auto text-center'}`}>
          <div className={`transition-all duration-1000 rounded-2xl mb-8 flex items-center justify-center shadow-xl transform rotate-[-3deg] ${showForm ? 'w-24 h-24' : 'w-40 h-40 mx-auto'}`}>
            {companyInfo.logo ? (
              <img src={companyInfo.logo} alt="Logo" className={`${showForm ? 'w-20 h-20' : 'w-36 h-36'} object-contain rounded-2xl`} />
            ) : (
              <div className="text-white font-bold text-2xl flex flex-col items-center">
                <span className={`${showForm ? 'text-[12px]' : 'text-[16px]'} leading-none opacity-60 uppercase font-light tracking-widest`}>M&F</span>
                <span className={showForm ? 'text-2xl' : 'text-3xl'}>LOGO</span>
              </div>
            )}
          </div>

          <h1 className={`font-black leading-tight mb-2 tracking-tighter text-gray-900 transition-all duration-1000 ${showForm ? 'text-4xl' : 'text-6xl md:text-7xl'}`}>
            MÃE & FILHO CONFECÇÃO
          </h1>
          <div className={`flex items-center space-x-4 mb-12 transition-all duration-1000 ${showForm ? 'justify-start' : 'justify-center'}`}>
            <span className="h-px w-12 bg-indigo-600/30"></span>
            <p className="text-sm font-bold text-indigo-600/60 tracking-[0.4em] uppercase">Confecção</p>
          </div>

          <h2 className={`font-bold mb-8 tracking-tight leading-tight transition-all duration-1000 ${showForm ? 'text-4xl' : 'text-5xl md:text-6xl max-w-2xl mx-auto'}`}>
            A tradição encontra <br />a eficácia <span className="text-indigo-600 italic underline decoration-wavy decoration-indigo-200">produtiva.</span>
          </h2>

          <p className={`text-gray-500 text-lg mb-12 leading-relaxed transition-all duration-1000 ${showForm ? 'max-w-sm' : 'max-w-xl mx-auto'}`}>
            Gerencie sua confecção com precisão impecável. Da modelagem à entrega final, tenha o controle total da sua produção e clientes em um único lugar seguro.
          </p>

          <div className={`grid gap-6 transition-all duration-1000 ${showForm ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto text-left'}`}>
            <div 
              onClick={() => setShowForm(true)}
              className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white group cursor-pointer hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 block ${!showForm ? 'border-2 border-indigo-200 shadow-lg' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors">
                  <ShieldCheck size={20} />
                </div>
                {!showForm && <div className="text-indigo-400 group-hover:text-white animate-pulse"><ChevronRight /></div>}
              </div>
              <h3 className="font-bold mb-1 group-hover:text-white transition-colors">Gestão Integrada</h3>
              <p className="text-sm text-gray-400 group-hover:text-indigo-100 transition-colors">
                {showForm ? 'Você está em modo de acesso.' : 'Clique para Acessar o Sistema e gerenciar sua produção.'}
              </p>
            </div>

            <Link 
              to="/register" 
              className={`bg-white/40 backdrop-blur-sm p-6 rounded-2xl border border-white/50 group cursor-pointer hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 block ${!showForm ? 'opacity-100' : 'opacity-80'}`}
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors">
                <Layers size={20} />
              </div>
              <h3 className="font-bold mb-1 group-hover:text-white transition-colors">Fluxo de Produção</h3>
              <p className="text-sm text-gray-400 group-hover:text-indigo-100 transition-colors">
                Clique aqui para <strong>Criar sua Conta</strong>.
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel: Scrollable Forms - Slide in from right */}
      <div className={`transition-all duration-1000 ease-in-out overflow-y-auto bg-white flex flex-col justify-center items-center ${showForm ? 'w-full md:w-[60%] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden'}`}>
        <div className="w-full max-w-md my-auto pt-20 md:pt-0 p-8 md:p-12">
          <div className="animate-in fade-in slide-in-from-right duration-700">
            <button onClick={() => setShowForm(false)} className="md:hidden mb-8 text-indigo-600 font-bold flex items-center">
               <ChevronRight className="rotate-180 mr-2" size={16} />
               Voltar
            </button>

            <h2 className="text-4xl font-bold mb-2 tracking-tight">Acessar Sistema</h2>
            <p className="text-gray-400 mb-8">Faça login para gerenciar sua confecção.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@galeria.com.br"
                  className="w-full px-5 py-4 bg-[#F8F9FF] border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-5 py-4 bg-[#F8F9FF] border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <Lock size={18} />
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-xl text-lg font-bold shadow-lg shadow-indigo-100 transition-all"
                isLoading={isLoading}
              >
                Entrar
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-gray-300">
                <span className="bg-white px-4">Ou continue com</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button className="flex items-center justify-center space-x-2 py-3 px-4 bg-[#F8F9FF] rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-5 h-5 bg-black rounded flex items-center justify-center text-white p-0.5">
                  <img src="https://www.google.com/favicon.ico" className="w-full h-full invert" alt="" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Google</span>
              </button>
              <button className="flex items-center justify-center space-x-2 py-3 px-4 bg-[#F8F9FF] rounded-xl hover:bg-gray-100 transition-colors">
                <Apple size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Apple</span>
              </button>
            </div>

            <p className="text-center text-gray-400 text-sm">
              Ainda não tem conta? <Link to="/register" className="text-indigo-600 font-bold hover:underline">Criar Conta</Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto py-8 w-full flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest px-8 text-center opacity-60">
            <span>© 2024 {companyInfo.name || 'MÃE & FILHO CONFECÇÃO'}.</span>
            <div className="flex space-x-4">
              <span className="hover:text-gray-600 cursor-pointer">Termos</span>
              <span className="hover:text-gray-600 cursor-pointer">Privacidade</span>
              <span className="hover:text-gray-600 cursor-pointer">Ajuda</span>
            </div>
        </div>
      </div>
    </div>
  );
};