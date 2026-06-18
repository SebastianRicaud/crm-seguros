import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isSignUp) await signUp(email, password, fullName);
      else await signIn(email, password);
      navigate('/');
    } catch (err: any) { setError(err.message || 'Error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 text-3xl">🛡️</div>
          <h1 className="text-2xl font-bold">CRM Seguros</h1>
          <p className="text-sm text-slate-500 mt-1">Productor Asesor</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />}
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Procesando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</Button>
        </form>
        <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700">
          {isSignUp ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate'}
        </button>
      </div>
    </div>
  );
}