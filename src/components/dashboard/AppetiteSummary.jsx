import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const getApetiteAnalise = (registosHoje, registosSemana, baseline = 85) => {
  if (!registosHoje || registosHoje.length === 0) {
    return {
      status: 'sem_dados',
      label: 'Sem dados',
      cor: 'gray',
      descricao: 'Ainda não há registos de alimentação para hoje.',
      percentagem: 0
    };
  }

  // Calcular percentagem de hoje (normal=100, parcial=50, recusou=0)
  const valorHoje = registosHoje.reduce((sum, r) => {
    if (r.nivel_ingestao === 'normal') return sum + 100;
    if (r.nivel_ingestao === 'parcial') return sum + 50;
    return sum;
  }, 0) / registosHoje.length;

  // Calcular média da semana
  const valorSemana = registosSemana?.length > 0 
    ? registosSemana.reduce((sum, r) => {
        if (r.nivel_ingestao === 'normal') return sum + 100;
        if (r.nivel_ingestao === 'parcial') return sum + 50;
        return sum;
      }, 0) / registosSemana.length
    : baseline;

  const diferenca = valorHoje - valorSemana;

  if (valorHoje >= 85) {
    return {
      status: 'normal',
      label: 'Apetite normal',
      cor: 'green',
      descricao: 'Está a comer normalmente. O apetite mantém-se estável.',
      percentagem: valorHoje,
      tendencia: diferenca > 10 ? 'melhoria' : diferenca < -10 ? 'reducao' : 'estavel'
    };
  } else if (valorHoje >= 60) {
    return {
      status: 'ligeiramente_reduzido',
      label: 'Apetite ligeiramente reduzido',
      cor: 'yellow',
      descricao: 'Comeu um pouco menos que o habitual hoje. Esta pequena variação é comum.',
      percentagem: valorHoje,
      tendencia: diferenca > 10 ? 'melhoria' : diferenca < -10 ? 'reducao' : 'estavel'
    };
  } else if (valorHoje >= 30) {
    return {
      status: 'reduzido',
      label: 'Apetite reduzido',
      cor: 'orange',
      descricao: 'O apetite está mais reduzido que o habitual. Convém acompanhar.',
      percentagem: valorHoje,
      tendencia: 'reducao'
    };
  } else {
    return {
      status: 'muito_reduzido',
      label: 'Apetite muito reduzido',
      cor: 'red',
      descricao: 'Comeu muito pouco ou recusou várias refeições. Atenção recomendada.',
      percentagem: valorHoje,
      tendencia: 'reducao'
    };
  }
};

const cores = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' }
};

export default function AppetiteSummary({ registosHoje, registosSemana, isLoading }) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const analise = getApetiteAnalise(registosHoje, registosSemana);
  const cor = cores[analise.cor];

  const TendenciaIcon = analise.tendencia === 'melhoria' ? TrendingUp : 
                        analise.tendencia === 'reducao' ? TrendingDown : Minus;

  return (
    <Card className={`${cor.bg} border-2 ${cor.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className={`w-5 h-5 ${cor.icon}`} />
            Alimentação
          </CardTitle>
          {analise.tendencia !== 'estavel' && (
            <TendenciaIcon className={`w-5 h-5 ${cor.icon}`} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className={`font-semibold text-lg ${cor.text}`}>{analise.label}</div>
          <p className="text-sm text-gray-600 mt-1">{analise.descricao}</p>
        </div>

        {registosHoje && registosHoje.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Refeições de hoje</div>
            <div className="grid grid-cols-4 gap-2">
              {['pequeno_almoco', 'almoco', 'lanche', 'jantar'].map(ref => {
                const registo = registosHoje.find(r => r.refeicao === ref);
                const emoji = {
                  pequeno_almoco: '🌅',
                  almoco: '🍽️',
                  lanche: '☕',
                  jantar: '🌙'
                }[ref];
                
                return (
                  <div key={ref} className="text-center">
                    <div className="text-lg mb-1">{emoji}</div>
                    <div className={`text-xs px-1 py-0.5 rounded ${
                      !registo ? 'bg-gray-200 text-gray-500' :
                      registo.nivel_ingestao === 'normal' ? 'bg-green-200 text-green-700' :
                      registo.nivel_ingestao === 'parcial' ? 'bg-yellow-200 text-yellow-700' :
                      'bg-red-200 text-red-700'
                    }`}>
                      {!registo ? '—' : 
                       registo.nivel_ingestao === 'normal' ? '✓' :
                       registo.nivel_ingestao === 'parcial' ? '½' : '✗'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}