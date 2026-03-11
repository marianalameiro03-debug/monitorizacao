import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UtensilsCrossed, Check, MinusCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const refeicoes = [
  { id: 'pequeno_almoco', label: 'Pequeno-almoço', icon: '🌅' },
  { id: 'almoco',         label: 'Almoço',          icon: '🍽️' },
  { id: 'lanche',         label: 'Lanche',           icon: '☕' },
  { id: 'jantar',         label: 'Jantar',           icon: '🌙' }
];

const niveis = [
  { id: 'normal',  label: 'Comeu normalmente',   icon: Check,       color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'   },
  { id: 'parcial', label: 'Comeu parcialmente',  icon: MinusCircle, color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700' },
  { id: 'recusou', label: 'Recusou',             icon: XCircle,     color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700'             }
];

export default function RegistoRefeicoes() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const hoje = new Date().toISOString().split('T')[0];

  // ── Auth ────────────────────────────────────────────────────
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { window.location.href = '/login'; return null; }
      const role = user.user_metadata?.role;
      if (role !== 'admin' && role !== 'staff') {
        window.location.href = '/';
        return null;
      }
      setUser(user);
      return user;
    }
  });

  // ── Residentes ativos ───────────────────────────────────────
  const { data: residentes = [], isLoading } = useQuery({
    queryKey: ['residentes-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Residente')
        .select('*')
        .eq('ativo', true);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Registos de hoje ────────────────────────────────────────
  const { data: registosHoje = [] } = useQuery({
    queryKey: ['registos-alimentacao-hoje'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('RegistoAlimentacao')
        .select('*')
        .eq('data', hoje);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ── Criar registo ───────────────────────────────────────────
  const registarMutation = useMutation({
    mutationFn: async ({ residente_id, refeicao, nivel_ingestao }) => {
      const { data, error } = await supabase
        .from('RegistoAlimentacao')
        .insert({
          residente_id,
          data: hoje,
          refeicao,
          nivel_ingestao,
          registado_por: user.email,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registos-alimentacao-hoje'] });
      toast.success('Registo guardado!');
    },
    onError: () => {
      toast.error('Erro ao guardar registo. Tente novamente.');
    }
  });

  const getRegistoAtual = (residente_id, refeicao_id) =>
    registosHoje.find(r => r.residente_id === residente_id && r.refeicao === refeicao_id);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registo de Refeições</h1>
        <p className="text-sm text-gray-500 mt-1">Hoje: {new Date().toLocaleDateString('pt-PT')}</p>
      </div>

      {/* Lista de Residentes */}
      <div className="space-y-6">
        {residentes.map(residente => (
          <Card key={residente.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{residente.nome}</CardTitle>
                  <p className="text-sm text-gray-500">Quarto {residente.quarto}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {registosHoje.filter(r => r.residente_id === residente.id).length}/4 refeições
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {refeicoes.map(refeicao => {
                  const registoExistente = getRegistoAtual(residente.id, refeicao.id);
                  const registado = !!registoExistente;

                  return (
                    <div key={refeicao.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{refeicao.icon}</span>
                        <span className="font-medium text-sm">{refeicao.label}</span>
                        {registado && <Check className="w-4 h-4 text-green-600 ml-auto" />}
                      </div>

                      {registado ? (
                        <div className="text-sm text-gray-600">
                          Registado: <span className="font-medium">
                            {niveis.find(n => n.id === registoExistente.nivel_ingestao)?.label}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {niveis.map(nivel => {
                            const Icon = nivel.icon;
                            return (
                              <button
                                key={nivel.id}
                                onClick={() => registarMutation.mutate({
                                  residente_id: residente.id,
                                  refeicao: refeicao.id,
                                  nivel_ingestao: nivel.id
                                })}
                                disabled={registarMutation.isPending}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${nivel.color}`}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="text-sm font-medium">{nivel.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {residentes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum residente ativo encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
