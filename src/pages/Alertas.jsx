import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────────────────────
// 🔑 Add your Supabase credentials to your .env file:
//    VITE_SUPABASE_URL=https://your-project.supabase.co
//    VITE_SUPABASE_ANON_KEY=your-anon-key
// ─────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const configCores = {
  verde:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100'  },
  amarelo:  { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
  laranja:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100' },
  vermelho: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100'    },
};

export default function Alertas() {
  const [user, setUser] = useState(null);
  const [residente, setResidente] = useState(null);
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
  const { data: residenteData } = useQuery({
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

  // ── Alertas ─────────────────────────────────────────────────
  const { data: alertas, isLoading } = useQuery({
    queryKey: ['alertas', residenteData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Alerta')
        .select('*')
        .eq('residente_id', residenteData.id)
        .order('created_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!residenteData,
  });

  // ── Mark as read ─────────────────────────────────────────────
  const marcarLidoMutation = useMutation({
    mutationFn: async (alertaId) => {
      if (!residente) throw new Error('Sem permissão');
      // Ownership check: only update alerts that belong to the linked resident
      const { error } = await supabase
        .from('Alerta')
        .update({ lido: true })
        .eq('id', alertaId)
        .eq('residente_id', residente.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alertas']);
    },
  });

  useEffect(() => {
    if (residenteData) setResidente(residenteData);
  }, [residenteData]);

  if (!residente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const alertasNaoLidos = alertas?.filter(a => !a.lido) || [];
  const alertasLidos    = alertas?.filter(a =>  a.lido) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Notificações</CardTitle>
                <p className="text-gray-500 mt-1">{residente.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="w-6 h-6 text-blue-500" />
                {alertasNaoLidos.length > 0 && (
                  <Badge className="bg-red-500">{alertasNaoLidos.length} novos</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Alertas não lidos */}
            {alertasNaoLidos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Novos</h3>
                {alertasNaoLidos.map(alerta => {
                  const config = configCores[alerta.gravidade];
                  return (
                    <Card key={alerta.id} className={`${config.bg} ${config.border} border-l-4`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className={`w-5 h-5 ${config.text}`} />
                              <h4 className={`font-semibold ${config.text}`}>{alerta.titulo}</h4>
                            </div>
                            <p className="text-gray-700 mb-3">{alerta.descricao}</p>
                            {alerta.indice_estabilidade !== null && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-600">Índice de estabilidade:</span>
                                <span className={`font-bold ${config.text}`}>
                                  {alerta.indice_estabilidade}/100
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(alerta.created_date).toLocaleString('pt-PT')}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => marcarLidoMutation.mutate(alerta.id)}
                            className="ml-4"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Alertas lidos */}
            {alertasLidos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Anteriores</h3>
                {alertasLidos.map(alerta => {
                  const config = configCores[alerta.gravidade];
                  return (
                    <Card key={alerta.id} className="opacity-60">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className={`w-4 h-4 ${config.text}`} />
                          <h4 className={`font-medium ${config.text}`}>{alerta.titulo}</h4>
                        </div>
                        <p className="text-sm text-gray-600">{alerta.descricao}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(alerta.created_date).toLocaleString('pt-PT')}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {alertas?.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Ainda não há notificações</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
