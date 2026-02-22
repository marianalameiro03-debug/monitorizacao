import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Activity, Heart, Bell, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ActivitySummary from '../components/dashboard/ActivitySummary';
import StabilityIndex from '../components/dashboard/StabilityIndex';
import ActivityChart from '../components/dashboard/ActivityChart';
import AppetiteSummary from '../components/dashboard/AppetiteSummary';
import AIAssistantAdvanced from '../components/dashboard/AIAssistantAdvanced';
import ModoToggle from '../components/dashboard/ModoToggle';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [user, setUser] = useState(null);
  const [residente, setResidente] = useState(null);
  const [showChat, setShowChat] = useState(false);

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

  const { data: ligacao, isLoading: loadingLigacao } = useQuery({
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

  const { data: residenteData, isLoading: loadingResidente } = useQuery({
    queryKey: ['residente', ligacao?.residente_id],
    queryFn: async () => {
      const residentes = await base44.entities.Residente.filter({ id: ligacao.residente_id });
      return residentes[0];
    },
    enabled: !!ligacao,
  });

  const { data: atividadeHoje, isLoading: loadingAtividade } = useQuery({
    queryKey: ['atividade-hoje', residenteData?.id],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      return await base44.entities.RegistoAtividade.filter({
        residente_id: residenteData.id,
        data: hoje
      }, '-hora');
    },
    enabled: !!residenteData,
  });

  const { data: alertasNaoLidos } = useQuery({
    queryKey: ['alertas-nao-lidos', residenteData?.id],
    queryFn: async () => {
      return await base44.entities.Alerta.filter({
        residente_id: residenteData.id,
        lido: false
      }, '-created_date', 5);
    },
    enabled: !!residenteData,
  });

  const { data: ultimaConsulta } = useQuery({
    queryKey: ['ultima-consulta', residenteData?.id],
    queryFn: async () => {
      const consultas = await base44.entities.Consulta.filter({
        residente_id: residenteData.id
      }, '-data_consulta', 1);
      return consultas[0];
    },
    enabled: !!residenteData,
  });

  const dataUltimaSemana = new Date();
  dataUltimaSemana.setDate(dataUltimaSemana.getDate() - 7);
  
  const { data: atividadeSemana = [] } = useQuery({
    queryKey: ['atividade-semana', residenteData?.id],
    queryFn: async () => {
      return await base44.entities.RegistoAtividade.filter({
        residente_id: residenteData.id,
        data: { $gte: dataUltimaSemana.toISOString().split('T')[0] }
      });
    },
    enabled: !!residenteData,
  });

  // Fetch registos de alimentação
  const hoje = new Date().toISOString().split('T')[0];
  
  const { data: alimentacaoHoje = [], isLoading: loadingAlimentacao } = useQuery({
    queryKey: ['alimentacao-hoje', residenteData?.id],
    queryFn: async () => {
      return await base44.entities.RegistoAlimentacao.filter({
        residente_id: residenteData.id,
        data: hoje
      });
    },
    enabled: !!residenteData,
  });

  const { data: alimentacaoSemana = [] } = useQuery({
    queryKey: ['alimentacao-semana', residenteData?.id],
    queryFn: async () => {
      return await base44.entities.RegistoAlimentacao.filter({
        residente_id: residenteData.id,
        data: { $gte: dataUltimaSemana.toISOString().split('T')[0] }
      });
    },
    enabled: !!residenteData,
  });

  useEffect(() => {
    if (residenteData) {
      setResidente(residenteData);
    }
  }, [residenteData]);

  if (loadingLigacao || loadingResidente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!ligacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Ainda não tem um residente associado. Por favor, configure a ligação nas definições.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!residente) return null;

  const calcularClassificacaoDia = () => {
    if (!atividadeHoje || atividadeHoje.length === 0) return 'sem_dados';
    
    const intensidadeMedia = atividadeHoje.reduce((sum, r) => sum + (r.intensidade_movimento || 0), 0) / atividadeHoje.length;
    
    if (intensidadeMedia > 70) return 'muito_ativo';
    if (intensidadeMedia > 50) return 'moderadamente_ativo';
    if (intensidadeMedia > 25) return 'calmo';
    return 'em_repouso';
  };

  const calcularIndiceEstabilidade = () => {
    if (!atividadeHoje || atividadeHoje.length === 0) return null;
    
    const intensidadeMedia = atividadeHoje.reduce((sum, r) => sum + (r.intensidade_movimento || 0), 0) / atividadeHoje.length;
    const baseline = residente.baseline_atividade || 50;
    const diferenca = Math.abs(intensidadeMedia - baseline);
    const percentualDiferenca = (diferenca / baseline) * 100;
    
    if (percentualDiferenca < 10) return { valor: 95, cor: 'verde', texto: 'Rotina estável' };
    if (percentualDiferenca < 20) return { valor: 75, cor: 'amarelo', texto: 'Pequenas variações' };
    if (percentualDiferenca < 35) return { valor: 55, cor: 'laranja', texto: 'Alterações moderadas' };
    return { valor: 30, cor: 'vermelho', texto: 'Alterações significativas' };
  };

  const classificacao = calcularClassificacaoDia();
  const estabilidade = calcularIndiceEstabilidade();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Toggle Modo Demo/Real */}
        <ModoToggle />

        {/* Cabeçalho */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{residente.nome}</h1>
              <p className="text-gray-500">Quarto {residente.quarto || '—'}</p>
            </div>
            <div className="flex gap-3">
              {alertasNaoLidos && alertasNaoLidos.length > 0 && (
                <div className="relative">
                  <Bell className="w-6 h-6 text-gray-400" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {alertasNaoLidos.length}
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowChat(!showChat)}
                className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Perguntas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { pergunta: "Como foi o dia?", icon: "📊" },
            { pergunta: "Está tudo normal?", icon: "✅" },
            { pergunta: "Houve alterações?", icon: "🔍" },
            { pergunta: "Como está em relação às consultas?", icon: "🩺" }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => setShowChat(true)}
              className="bg-white hover:bg-blue-50 border border-gray-200 rounded-xl p-4 text-left transition-all hover:shadow-md hover:border-blue-300 group"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                {item.pergunta}
              </div>
            </button>
          ))}
        </div>

        {/* Última Consulta */}
        {ultimaConsulta && (
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm text-purple-600 font-medium mb-1">Última Consulta</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {ultimaConsulta.especialidade || ultimaConsulta.tipo_consulta}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(ultimaConsulta.data_consulta).toLocaleDateString('pt-PT')}
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(true)}
                  className="px-4 py-2 bg-white hover:bg-purple-50 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Perguntar sobre consulta
                </button>
              </div>
              {ultimaConsulta.resumo_ia && (
                <p className="text-sm text-gray-700 line-clamp-2">
                  {ultimaConsulta.resumo_ia.substring(0, 120)}...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Resumos */}
          <div className="lg:col-span-1 space-y-6">
            <ActivitySummary 
              classificacao={classificacao}
              atividadeHoje={atividadeHoje}
              isLoading={loadingAtividade}
            />
            
            <AppetiteSummary 
              registosHoje={alimentacaoHoje}
              registosSemana={alimentacaoSemana}
              isLoading={loadingAlimentacao}
            />
            
            {estabilidade && (
              <StabilityIndex estabilidade={estabilidade} />
            )}
          </div>

          {/* Coluna Direita - Gráfico */}
          <div className="lg:col-span-2">
            <ActivityChart 
              dados={atividadeHoje}
              isLoading={loadingAtividade}
            />
          </div>
        </div>

        {/* Assistente IA */}
        {showChat && (
          <AIAssistantAdvanced 
            residente={residente}
            atividadeHoje={atividadeHoje}
            atividadeSemana={atividadeSemana}
            alimentacaoHoje={alimentacaoHoje}
            alimentacaoSemana={alimentacaoSemana}
            estabilidade={estabilidade}
            classificacao={classificacao}
            consulta={ultimaConsulta}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    </div>
  );
}