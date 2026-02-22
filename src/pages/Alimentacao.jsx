import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UtensilsCrossed, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const calcularIndiceEstabilidade = (registosSemana) => {
  if (!registosSemana || registosSemana.length < 4) return null;
  
  // Calcular variação diária
  const porDia = {};
  registosSemana.forEach(r => {
    if (!porDia[r.data]) porDia[r.data] = [];
    porDia[r.data].push(r.nivel_ingestao === 'normal' ? 100 : r.nivel_ingestao === 'parcial' ? 50 : 0);
  });
  
  const mediasPorDia = Object.values(porDia).map(valores => 
    valores.reduce((a, b) => a + b, 0) / valores.length
  );
  
  if (mediasPorDia.length < 2) return null;
  
  // Calcular desvio padrão
  const media = mediasPorDia.reduce((a, b) => a + b, 0) / mediasPorDia.length;
  const variancia = mediasPorDia.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / mediasPorDia.length;
  const desvioPadrao = Math.sqrt(variancia);
  
  // Índice: 100 - (desvio normalizado)
  const indice = Math.max(0, Math.min(100, 100 - (desvioPadrao / 50 * 100)));
  
  return Math.round(indice);
};

const getClassificacaoApetite = (mediaAtual, mediaSemana) => {
  const diferenca = mediaAtual - mediaSemana;
  
  if (mediaAtual >= 85 && Math.abs(diferenca) <= 10) {
    return { label: 'Estável', cor: 'green', descricao: 'O apetite mantém-se consistente e saudável.' };
  } else if (mediaAtual >= 70 && mediaAtual < 85) {
    return { label: 'Ligeiramente reduzido', cor: 'yellow', descricao: 'Pequena redução no apetite, comum em variações diárias.' };
  } else if (mediaAtual >= 50 && mediaAtual < 70) {
    return { label: 'Reduzido', cor: 'orange', descricao: 'O apetite está abaixo do habitual. Recomenda-se atenção.' };
  } else if (mediaAtual < 50) {
    return { label: 'Significativamente alterado', cor: 'red', descricao: 'O apetite apresenta alteração significativa que merece acompanhamento.' };
  }
  
  return { label: 'Sem dados suficientes', cor: 'gray', descricao: 'Ainda não há dados suficientes para análise.' };
};

export default function Alimentacao() {
  const [user, setUser] = useState(null);

  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      return userData;
    }
  });

  const { data: ligacao } = useQuery({
    queryKey: ['ligacao-familiar', user?.email],
    queryFn: () => base44.entities.LigacaoFamiliar.filter({ 
      familiar_email: user.email,
      status: 'aprovado'
    }),
    enabled: !!user,
    select: (data) => data[0]
  });

  const { data: residente } = useQuery({
    queryKey: ['residente', ligacao?.residente_id],
    queryFn: () => base44.entities.Residente.filter({ id: ligacao.residente_id }),
    enabled: !!ligacao,
    select: (data) => data[0]
  });

  const hoje = new Date().toISOString().split('T')[0];
  const ultimos7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const ultimos14Dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: alimentacaoHoje = [], isLoading: loadingHoje } = useQuery({
    queryKey: ['alimentacao-hoje', residente?.id],
    queryFn: () => base44.entities.RegistoAlimentacao.filter({
      residente_id: residente.id,
      data: hoje
    }),
    enabled: !!residente
  });

  const { data: alimentacao7Dias = [], isLoading: loading7Dias } = useQuery({
    queryKey: ['alimentacao-7dias', residente?.id],
    queryFn: () => base44.entities.RegistoAlimentacao.filter({
      residente_id: residente.id,
      data: { $gte: ultimos7Dias }
    }),
    enabled: !!residente
  });

  const { data: alimentacao14Dias = [] } = useQuery({
    queryKey: ['alimentacao-14dias', residente?.id],
    queryFn: () => base44.entities.RegistoAlimentacao.filter({
      residente_id: residente.id,
      data: { $gte: ultimos14Dias }
    }),
    enabled: !!residente
  });

  if (!residente) {
    return (
      <div className="min-h-screen p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Análise de dados
  const calcularMedia = (registos) => {
    if (!registos || registos.length === 0) return 0;
    return registos.reduce((sum, r) => {
      if (r.nivel_ingestao === 'normal') return sum + 100;
      if (r.nivel_ingestao === 'parcial') return sum + 50;
      return sum;
    }, 0) / registos.length;
  };

  const mediaHoje = calcularMedia(alimentacaoHoje);
  const media7Dias = calcularMedia(alimentacao7Dias);
  const media14Dias = calcularMedia(alimentacao14Dias);
  const indiceEstabilidade = calcularIndiceEstabilidade(alimentacao7Dias);
  const classificacao = getClassificacaoApetite(mediaHoje, media7Dias);

  // Preparar dados para gráfico semanal
  const dadosPorDia = {};
  alimentacao7Dias.forEach(r => {
    if (!dadosPorDia[r.data]) {
      dadosPorDia[r.data] = { data: r.data, valores: [] };
    }
    dadosPorDia[r.data].valores.push(
      r.nivel_ingestao === 'normal' ? 100 : r.nivel_ingestao === 'parcial' ? 50 : 0
    );
  });

  const dadosGrafico = Object.values(dadosPorDia)
    .map(d => ({
      data: new Date(d.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      media: d.valores.reduce((a, b) => a + b, 0) / d.valores.length
    }))
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  // Tendência
  const tendencia = mediaHoje > media7Dias + 10 ? 'melhoria' : 
                    mediaHoje < media7Dias - 10 ? 'reducao' : 'estavel';

  const cores = {
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' }
  };

  const cor = cores[classificacao.cor];

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alimentação</h1>
        <p className="text-sm text-gray-500 mt-1">{residente.nome}</p>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Classificação do Apetite */}
        <Card className={`${cor.bg} border-2 ${cor.border}`}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Estado Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cor.text} mb-2`}>{classificacao.label}</div>
            <p className="text-sm text-gray-600">{classificacao.descricao}</p>
          </CardContent>
        </Card>

        {/* Índice de Estabilidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Índice de Estabilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {indiceEstabilidade !== null ? indiceEstabilidade : '—'}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  indiceEstabilidade >= 80 ? 'bg-green-500' :
                  indiceEstabilidade >= 60 ? 'bg-yellow-500' :
                  indiceEstabilidade >= 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${indiceEstabilidade || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {indiceEstabilidade >= 80 ? 'Muito estável' :
               indiceEstabilidade >= 60 ? 'Moderadamente estável' :
               indiceEstabilidade >= 40 ? 'Pouco estável' : 'Irregular'}
            </p>
          </CardContent>
        </Card>

        {/* Tendência */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Tendência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {tendencia === 'melhoria' && <TrendingUp className="w-6 h-6 text-green-600" />}
              {tendencia === 'reducao' && <TrendingDown className="w-6 h-6 text-red-600" />}
              {tendencia === 'estavel' && <Minus className="w-6 h-6 text-blue-600" />}
              <span className="text-2xl font-bold text-gray-900">
                {tendencia === 'melhoria' ? 'Em melhoria' :
                 tendencia === 'reducao' ? 'Em redução' : 'Estável'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Face à semana passada
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Registos de Hoje */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Refeições de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'pequeno_almoco', label: 'Pequeno-almoço', emoji: '🌅' },
              { id: 'almoco', label: 'Almoço', emoji: '🍽️' },
              { id: 'lanche', label: 'Lanche', emoji: '☕' },
              { id: 'jantar', label: 'Jantar', emoji: '🌙' }
            ].map(refeicao => {
              const registo = alimentacaoHoje.find(r => r.refeicao === refeicao.id);
              return (
                <div key={refeicao.id} className="text-center p-4 border rounded-lg">
                  <div className="text-3xl mb-2">{refeicao.emoji}</div>
                  <div className="text-sm font-medium text-gray-700 mb-2">{refeicao.label}</div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    !registo ? 'bg-gray-200 text-gray-600' :
                    registo.nivel_ingestao === 'normal' ? 'bg-green-200 text-green-700' :
                    registo.nivel_ingestao === 'parcial' ? 'bg-yellow-200 text-yellow-700' :
                    'bg-red-200 text-red-700'
                  }`}>
                    {!registo ? 'Não registado' :
                     registo.nivel_ingestao === 'normal' ? 'Normal' :
                     registo.nivel_ingestao === 'parcial' ? 'Parcial' : 'Recusou'}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Semanal */}
      <Card>
        <CardHeader>
          <CardTitle>Padrão Semanal de Apetite</CardTitle>
        </CardHeader>
        <CardContent>
          {dadosGrafico.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGrafico}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(0)}%`, 'Apetite']}
                />
                <Line 
                  type="monotone" 
                  dataKey="media" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Sem dados suficientes para gráfico
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{mediaHoje.toFixed(0)}%</div>
            <p className="text-sm text-gray-500">{alimentacaoHoje.length}/4 refeições</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{media7Dias.toFixed(0)}%</div>
            <p className="text-sm text-gray-500">Média semanal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Últimos 14 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{media14Dias.toFixed(0)}%</div>
            <p className="text-sm text-gray-500">Média quinzenal</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}