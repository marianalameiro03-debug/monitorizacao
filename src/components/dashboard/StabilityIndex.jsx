import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Minus, TrendingDown, Check } from 'lucide-react';

const coresConfig = {
  verde: {
    bg: 'bg-green-100',
    barra: 'bg-green-500',
    texto: 'text-green-700',
    icon: Check,
  },
  amarelo: {
    bg: 'bg-yellow-100',
    barra: 'bg-yellow-500',
    texto: 'text-yellow-700',
    icon: Minus,
  },
  laranja: {
    bg: 'bg-orange-100',
    barra: 'bg-orange-500',
    texto: 'text-orange-700',
    icon: TrendingDown,
  },
  vermelho: {
    bg: 'bg-red-100',
    barra: 'bg-red-500',
    texto: 'text-red-700',
    icon: TrendingDown,
  }
};

export default function StabilityIndex({ estabilidade }) {
  const config = coresConfig[estabilidade.cor];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Estabilidade da rotina</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`${config.bg} rounded-xl p-4 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${config.texto}`} />
              <span className={`text-2xl font-bold ${config.texto}`}>
                {estabilidade.valor}
              </span>
              <span className="text-gray-500 text-sm">/100</span>
            </div>
          </div>
          
          {/* Barra de progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div 
              className={`${config.barra} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${estabilidade.valor}%` }}
            />
          </div>

          <p className={`text-sm font-medium ${config.texto}`}>
            {estabilidade.texto}
          </p>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 80-100: Rotina estável</p>
          <p>• 60-79: Pequenas variações</p>
          <p>• 40-59: Alterações moderadas</p>
          <p>• 0-39: Alterações significativas</p>
        </div>
      </CardContent>
    </Card>
  );
}