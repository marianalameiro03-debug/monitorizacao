import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, User, LogOut } from 'lucide-react';

export default function Definicoes() {
  const [user, setUser] = useState(null);
  const [codigoResidente, setCodigoResidente] = useState('');
  const [parentesco, setParentesco] = useState('');
  const queryClient = useQueryClient();

  // ── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        window.location.href = '/login';
      } else {
        setUser(user);
      }
    };
    loadUser();
  }, []);

  // ── Ligação Familiar ────────────────────────────────────────
  const { data: ligacao } = useQuery({
    queryKey: ['ligacao', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('LigacaoFamiliar')
        .select('*')
        .eq('familiar_email', user.email)
        .eq('status', 'aprovado')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Residente ───────────────────────────────────────────────
  const { data: residente } = useQuery({
    queryKey: ['residente', ligacao?.residente_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Residente')
        .select('*')
        .eq('id', ligacao.residente_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ligacao,
  });

  // ── Criar Ligação ───────────────────────────────────────────
  const criarLigacaoMutation = useMutation({
    mutationFn: async () => {
      // Find residente by code
      const { data: residentes, error: findError } = await supabase
        .from('Residente')
        .select('*')
        .eq('codigo', codigoResidente)
        .limit(1);
      if (findError) throw findError;
      if (!residentes || residentes.length === 0) {
        throw new Error('Código de residente não encontrado');
      }

      const { data, error } = await supabase
        .from('LigacaoFamiliar')
        .insert({
          residente_id: residentes[0].id,
          familiar_email: user.email,
          parentesco,
          status: 'aprovado',
          data_pedido: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ligacao']);
      setCodigoResidente('');
      setParentesco('');
    },
  });

  // ── Logout ──────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-500" />
              <CardTitle className="text-2xl">Definições</CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Perfil do utilizador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm text-gray-600">Nome</Label>
              <p className="font-medium">{user?.user_metadata?.full_name || '—'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Email</Label>
              <p className="font-medium">{user?.email || '—'}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="w-full mt-4">
              <LogOut className="w-4 h-4 mr-2" />
              Terminar sessão
            </Button>
          </CardContent>
        </Card>

        {/* Ligação ao residente */}
        {residente ? (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg">Residente Associado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm text-gray-600">Nome</Label>
                <p className="font-medium text-lg">{residente.nome}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Quarto</Label>
                <p className="font-medium">{residente.quarto || '—'}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Parentesco</Label>
                <p className="font-medium">{ligacao?.parentesco || '—'}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Associar Residente</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Indique o código do seu familiar fornecido pelo lar
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  criarLigacaoMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="codigo">Código do residente</Label>
                  <Input
                    id="codigo"
                    value={codigoResidente}
                    onChange={(e) => setCodigoResidente(e.target.value)}
                    placeholder="Ex: RES001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="parentesco">Parentesco</Label>
                  <Input
                    id="parentesco"
                    value={parentesco}
                    onChange={(e) => setParentesco(e.target.value)}
                    placeholder="Ex: Filho/a, Neto/a"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={criarLigacaoMutation.isPending}
                >
                  {criarLigacaoMutation.isPending ? 'A associar...' : 'Associar residente'}
                </Button>
                {criarLigacaoMutation.isError && (
                  <p className="text-sm text-red-600 mt-2">
                    {criarLigacaoMutation.error.message}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
