import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Heart, Moon, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const classificacoes = {
  muito_ativo: {
    label: 'Muito ativo',
    icon: Zap,
    cor: 'text-green-600',
    bg: 'bg-green-50',
    descricao: 'Dia com bastante movimento'
  },
  moderadamente_ativo: {
    label: 'Moderadamente ativo',
    icon: Activity,
    cor: 'text-blue-600',
    bg: 'bg-blue-50',
    descricao: 'Dia com atividade normal'
  },
  calmo: {
    label: 'Mais calmo que o habitual',
    icon: Heart,
    cor: 'text-amber-600',
    bg: 'bg-amber-50',
    descricao: 'Dia mais tranquilo'
  },
  em_repouso: {
    label: 'Predominantemente em repouso',
    icon: Moon,
    cor: 'text-purple-600',
    bg: 'bg-purple-50',
    descricao: 'Dia de descanso'
  },
  sem_dados: {
    label: 'Sem dados',
    icon: Activity,
    cor: 'text-gray-400',
    bg: 'bg-gray-50',
    descricao: 'Aguardando informação'
  }
};

export default function ActivitySummary({ classificacao, atividadeHoje, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resumo do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const config = classificacoes[classificacao] || classificacoes.sem_dados;
  const Icon = config.icon;

  return (
    <Card className="border-l-4 border-l-blue-400">
      <CardHeader>
        <CardTitle className="text-lg">Resumo do dia</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${config.bg} rounded-xl p-4 mb-4`}>
          <div className="flex items-center gap-3 mb-2">
            <Icon className={`w-8 h-8 ${config.cor}`} />
            <h3 className={`text-xl font-semibold ${config.cor}`}>
              {config.label}
            </h3>
          </div>
          <p className="text-gray-600 text-sm">{config.descricao}</p>
        </div>

        {atividadeHoje && atividadeHoje.length > 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Períodos registados:</span>
              <span className="font-medium">{atividadeHoje.length}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Última atualização:</span>
              <span className="font-medium">
                {Math.max(...atividadeHoje.map(a => a.hora))}:00
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}