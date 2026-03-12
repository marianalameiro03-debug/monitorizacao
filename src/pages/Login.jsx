import React, { useState } from 'react';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus } from 'lucide-react';
 
export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
 
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
 
    const { error } = await supabase.auth.signInWithPassword({ email, password });
 
    if (error) {
      setErro('Email ou password incorretos. Por favor tente novamente.');
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };
 
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setSucesso('');
 
    if (password !== confirmPassword) {
      setErro('As passwords não coincidem.');
      setLoading(false);
      return;
    }
 
    if (password.length < 6) {
      setErro('A password deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }
 
    const { error } = await supabase.auth.signUp({ email, password });
 
    if (error) {
      setErro(error.message);
      setLoading(false);
    } else {
      setSucesso('Conta criada! Verifique o seu email para confirmar o registo.');
      setLoading(false);
    }
  };
 
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setErro('Erro ao entrar com Google. Tente novamente.');
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {mode === 'login'
              ? <LogIn className="w-8 h-8 text-blue-600" />
              : <UserPlus className="w-8 h-8 text-blue-600" />
            }
          </div>
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Bem-vindo' : 'Criar conta'}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Inicie sessão para continuar' : 'Crie a sua conta gratuitamente'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
 
          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center gap-3"
            onClick={handleGoogleLogin}
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
            Continuar com Google
          </Button>
 
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
 
          {/* Email/Password Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o_seu_email@exemplo.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
 
            {mode === 'signup' && (
              <div>
                <Label htmlFor="confirmPassword">Confirmar Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}
 
            {erro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </p>
            )}
 
            {sucesso && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                {sucesso}
              </p>
            )}
 
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'A processar...'
                : mode === 'login' ? 'Entrar' : 'Criar conta'
              }
            </Button>
          </form>
 
          {/* Toggle login/signup */}
          <p className="text-center text-sm text-gray-500">
            {mode === 'login' ? (
              <>Não tem conta?{' '}
                <button
                  onClick={() => { setMode('signup'); setErro(''); setSucesso(''); }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>Já tem conta?{' '}
                <button
                  onClick={() => { setMode('login'); setErro(''); setSucesso(''); }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Iniciar sessão
                </button>
              </>
            )}
          </p>
 
        </CardContent>
      </Card>
    </div>
  );
}