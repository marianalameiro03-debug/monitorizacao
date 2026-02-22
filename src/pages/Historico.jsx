import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Historico() {
  const [user, setUser] = useState(null);
  const [residente, setResidente] = useState(null);
  const [periodo, setPeriodo] = useState('semana');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (err) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: ligacao } = useQuery({
    queryKey: ['ligacao', user?.email],
    queryFn: async () => {
      const ligacoes = await base44.entities.LigacaoFamiliar.filter({
        familiar_email: user.email,
        status: 'aprovado'
      });
      return ligacoes[0];
    },
    enabled: !!user,
  });

  const { data: residenteData } = useQuery({
    queryKey: ['residente', ligacao?.residente_id],
    queryFn: async () => {
      const residentes = await base44.entities.Residente.filter({ id: ligacao.residente_id });
      return residentes[0];
    },
    enabled: !!ligacao,
  });

  const { data: historico, isLoading } = useQuery({
    queryKey: ['historico', residenteData?.id, periodo],
    queryFn: async () => {
      const dias = periodo === 'semana' ? 7 : 30;
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - dias);
      
      return await base44.entities.RegistoAtividade.filter({
        residente_id: residenteData.id,
      }, '-data', 500);
    },
    enabled: !!residenteData,
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

  const agruparPorDia = () => {
    if (!historico) return [];
    
    const porDia = {};
    historico.forEach(reg => {
      if (!porDia[reg.data]) {
        porDia[reg.data] = { total: 0, count: 0 };
      }
      porDia[reg.data].total += reg.intensidade_movimento || 0;
      porDia[reg.data].count += 1;
    });

    return Object.entries(porDia)
      .map(([data, { total, count }]) => ({
        data: new Date(data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
        movimento: Math.round(total / count),
      }))
      .slice(-14)
      .reverse();
  };

  const dadosGrafico = agruparPorDia();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Histórico de Atividade</CardTitle>
                <p className="text-gray-500 mt-1">{residente.nome}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={periodo} onValueChange={setPeriodo}>
              <TabsList className="mb-6">
                <TabsTrigger value="semana">Última semana</TabsTrigger>
                <TabsTrigger value="mes">Último mês</TabsTrigger>
              </TabsList>

              <TabsContent value={periodo}>
                {isLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : dadosGrafico.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={dadosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="data" stroke="#6b7280" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="movimento" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600 mb-1">Média do período</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {Math.round(dadosGrafico.reduce((sum, d) => sum + d.movimento, 0) / dadosGrafico.length)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600 mb-1">Dia mais ativo</p>
                          <p className="text-2xl font-bold text-green-600">
                            {Math.max(...dadosGrafico.map(d => d.movimento))}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="pt-6">
                          <p className="text-sm text-gray-600 mb-1">Dia mais calmo</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {Math.min(...dadosGrafico.map(d => d.movimento))}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <p>Ainda não há dados históricos suficientes</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}