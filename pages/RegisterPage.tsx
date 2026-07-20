import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/Button';
import { UserRole } from '../types';
import { 
  CheckCircle2, 
  Layers, 
  Mail, 
  ArrowRight, 
  ShieldCheck,
  HelpCircle,
  Apple
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, registerUser, verifyOtp, login, companyInfo, sendOtp } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<'signup' | 'verify'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setPasswordMatch(password === confirmPassword || !confirmPassword);
  }, [password, confirmPassword]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await registerUser(email, password, UserRole.ADMIN, fullName);
      setView('verify');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Verifique os dados e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Por favor, insira o código completo.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const verified = await verifyOtp(email, code);
      if (verified) {
        const success = await login(email, password);
        if (success) {
          navigate('/', { replace: true });
        }
      } else {
        setError('Código inválido ou expirado. Por favor, tente novamente.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro na verificação. Tente reenviar o código.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row font-sans text-gray-900 overflow-hidden bg-white">
      {/* Top Header - Floating */}
      <div className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-20 pointer-events-none">
        <div className="font-bold text-sm tracking-[0.3em] uppercase opacity-40">{companyInfo.name || 'MÃE & FILHO CONFECÇÃO'}</div>
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 text-gray-400 p-2 rounded-full cursor-pointer hover:bg-indigo-600 hover:text-white transition-all pointer-events-auto">
          <HelpCircle size={16} />
        </div>
      </div>

      {/* Left Panel: Fixed/Static Branding */}
      <div className="hidden md:flex md:w-[40%] bg-[#F8F9FF] p-16 flex-col justify-center relative overflow-hidden sticky top-0 h-screen">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-30"></div>

        <div className="relative z-10 max-w-lg">
          <div className="w-24 h-24 bg-black rounded-2xl mb-8 flex items-center justify-center shadow-2xl transform rotate-[-3deg]">
            {companyInfo.logo ? (
              <img src={companyInfo.logo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div className="text-white font-bold text-2xl flex flex-col items-center">
                <span className="text-[12px] leading-none opacity-60">M&F</span>
                <span className="text-2xl">LOGO</span>
              </div>
            )}
          </div>

          <h1 className="text-6xl font-black leading-tight mb-2 tracking-tighter text-gray-900">
            MÃE & FILHO
          </h1>
          <div className="flex items-center space-x-4 mb-12">
            <span className="h-px w-12 bg-indigo-600/30"></span>
            <p className="text-sm font-bold text-indigo-600/60 tracking-[0.4em] uppercase">Confecção</p>
          </div>

          <h2 className="text-5xl font-bold mb-8 tracking-tight leading-tight">
            {view === 'verify' ? (
              <>Sua segurança <br /><span className="text-indigo-600 italic">em primeiro lugar.</span></>
            ) : (
              <>Crie sua conta e <br />transforme sua <span className="text-indigo-600 italic underline decoration-wavy decoration-indigo-200">produção.</span></>
            )}
          </h2>

          <p className="text-gray-500 text-lg mb-12 max-w-sm leading-relaxed">
            {view === 'verify' ? 
              'Validamos seu acesso para garantir que apenas você tenha controle sobre sua confecção e dados de produção.' :
              'Comece sua jornada com um sistema de gestão robusto, projetado para quem busca organização e excelência em cada peça produzida.'
            }
          </p>

          <div className="grid grid-cols-1 gap-6">
            <Link to="/login" className="bg-white/40 backdrop-blur-sm p-6 rounded-2xl border border-white group cursor-pointer hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 block">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold mb-1 group-hover:text-white transition-colors">Gestão Integrada</h3>
              <p className="text-sm text-gray-400 group-hover:text-indigo-100 transition-colors">Clique aqui para <strong>Acessar o Sistema</strong>.</p>
            </Link>

            <Link to="/register" className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-white/50 group cursor-pointer hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-100 transition-all transform hover:-translate-y-1 active:scale-95 block">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-white/20 group-hover:text-white transition-colors">
                <Layers size={20} />
              </div>
              <h3 className="font-bold mb-1 group-hover:text-white transition-colors">Fluxo de Produção</h3>
              <p className="text-sm text-gray-400 group-hover:text-indigo-100 transition-colors">Clique aqui para <strong>Criar sua Conta</strong>.</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel: Scrollable Forms */}
      <div className="w-full md:w-[60%] overflow-y-auto bg-white p-8 md:p-24 flex flex-col justify-center items-center">
        <div className="w-full max-w-md my-auto pt-20 md:pt-0">
          {view === 'signup' && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <h2 className="text-4xl font-bold mb-2 tracking-tight">Criar Conta</h2>
              <p className="text-gray-400 mb-8">Inicie sua gestão com eficiência máxima hoje mesmo.</p>

              <form onSubmit={handleSignUp} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Alexandre Silva"
                    className="w-full px-5 py-4 bg-[#F8F9FF] border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                  />
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Senha</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-[#F8F9FF] border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Confirmar</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-5 py-4 bg-[#F8F9FF] border-none rounded-xl focus:ring-2 transition-all placeholder:text-gray-300 ${!passwordMatch ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'}`}
                    />
                  </div>
                </div>

                <div className="flex items-center text-[11px] text-[#A66D4A] font-medium ml-1">
                  <span className="w-4 h-4 rounded-full bg-[#A66D4A] flex items-center justify-center mr-2 text-[8px] text-white">
                    <CheckCircle2 size={10} />
                  </span>
                  A senha atende aos requisitos de complexidade
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-xl text-lg font-bold shadow-lg shadow-indigo-100 transition-all"
                  isLoading={isLoading}
                >
                  Criar Conta
                </Button>
              </form>

              <p className="mt-8 text-center text-gray-400 text-sm">
                Já tem uma conta? <Link to="/login" className="text-indigo-600 font-bold hover:underline">Entrar</Link>
              </p>

              <div className="mt-12 bg-[#F8F9FF] p-6 rounded-2xl text-[10px] text-gray-400 leading-relaxed text-center">
                Ao clicar em "Criar Conta", você concorda com nossos <span className="text-gray-900 font-bold underline cursor-pointer">Termos de Serviço</span> e <span className="text-gray-900 font-bold underline cursor-pointer">Política de Privacidade</span>.
              </div>
            </div>
          )}

          {view === 'verify' && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8">
                <Mail size={24} />
              </div>
              <h2 className="text-4xl font-bold mb-2 tracking-tight">Verifique seu e-mail</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Enviamos um código de 6 dígitos para <span className="text-gray-900 font-bold">{email}</span>
              </p>

              <form onSubmit={handleVerify} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 ml-1">Código de Verificação</label>
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-full h-16 bg-[#F8F9FF] border-none rounded-2xl text-center text-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="•"
                      />
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-xl text-lg font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center space-x-2"
                  isLoading={isLoading}
                >
                  <span>Verificar Acesso</span>
                  <ArrowRight size={20} />
                </Button>
              </form>

              <div className="mt-8 text-center text-sm">
                <p className="text-gray-400">Não recebeu o código? <button onClick={() => sendOtp(email)} className="text-indigo-600 font-bold hover:underline">Reenviar Código</button></p>
                <button onClick={() => setView('signup')} className="mt-6 flex items-center justify-center mx-auto text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowRight size={16} className="rotate-180 mr-2" />
                  <span>Voltar para o Registro</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 md:mt-24 w-full flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest px-8 text-center">
            <span className="hidden md:inline">© 2024 {companyInfo.name || 'MÃE & FILHO CONFECÇÃO'}.</span>
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
