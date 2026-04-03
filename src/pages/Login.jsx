import React, { useState } from 'react';
import { supabase } from '@/api/base44Client';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus, Link } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'associate'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codigoResidente, setCodigoResidente] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    logger.auth.loginAttempt(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.auth.loginFailure(email, error.message);
      setErro('Email ou password incorretos. Por favor tente novamente.');
      setLoading(false);
      return;
    }
    logger.auth.loginSuccess(email);

    // Check if user already has an associated resident
    const { data: ligacao } = await supabase
      .from('LigacaoFamiliar')
      .select('*')
      .eq('familiar_email', data.user.email)
      .eq('status', 'aprovado')
      .limit(1);

    if (ligacao && ligacao.length > 0) {
      window.location.href = '/';
    } else {
      // No resident associated yet — ask for code
      setMode('associate');
      setLoading(false);
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

    logger.auth.signupAttempt(email);
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      logger.auth.signupFailure(email, error.message);
      setErro(error.message);
      setLoading(false);
    } else {
      logger.auth.signupSuccess(email);
      // Go to association step
      setMode('associate');
      setLoading(false);
    }
  };

  const handleAssociate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErro('Sessão expirada. Por favor faça login novamente.');
      setMode('login');
      setLoading(false);
      return;
    }

    // Find resident by code
    const { data: residente, error: residenteError } = await supabase
      .from('Residente')
      .select('*')
      .eq('codigo', codigoResidente.trim())
      .single();

    if (residenteError || !residente) {
      setErro('Código de residente não encontrado. Verifique o código e tente novamente.');
      setLoading(false);
      return;
    }

    // Create LigacaoFamiliar
    const { error: ligacaoError } = await supabase.from('LigacaoFamiliar').insert({
      residente_id: residente.id,
      familiar_email: user.email,
      parentesco: parentesco || 'Familiar',
      status: 'aprovado',
      data_pedido: new Date().toISOString().split('T')[0],
    });

    if (ligacaoError) {
      setErro('Erro ao associar residente. Tente novamente.');
      setLoading(false);
      return;
    }

    // Success — go to app
    window.location.href = '/';
  };

  const handleGoogleLogin = async () => {
    logger.auth.oauthAttempt('google');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) {
      logger.auth.oauthFailure('google', error.message);
      setErro('Erro ao entrar com Google. Tente novamente.');
    }
  };

  // ── Association screen ───────────────────────────────────
  if (mode === 'associate') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Associar Residente</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Insira o código do residente que lhe foi fornecido
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssociate} className="space-y-4">
              <div>
                <Label htmlFor="codigo">Código do Residente</Label>
                <Input
                  id="codigo"
                  type="text"
                  value={codigoResidente}
                  onChange={(e) => setCodigoResidente(e.target.value)}
                  placeholder="ex: RES001"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Este código foi fornecido pela instituição
                </p>
              </div>

              <div>
                <Label htmlFor="parentesco">Parentesco (opcional)</Label>
                <Input
                  id="parentesco"
                  type="text"
                  value={parentesco}
                  onChange={(e) => setParentesco(e.target.value)}
                  placeholder="ex: Filho, Filha, Sobrinho..."
                />
              </div>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'A verificar...' : 'Associar e Entrar'}
              </Button>

              <p className="text-center text-xs text-gray-400">
                Não tem o código? Contacte a instituição de cuidados.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Login / Signup screen ────────────────────────────────
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