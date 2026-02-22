import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Beaker, Database } from 'lucide-react';

export default function SimulationToggle({ modoSimulacao, onToggle, cenarioAtual, onCenarioChange }) {
  const cenarios = [
    { id: 'normal', label: 'Semana Normal', descricao: 'Padrão estável de atividade e alimentação' },
    { id: 'reducao_apetite', label: 'Redução de Apetite', descricao: 'Apetite gradualmente reduzido nos últimos dias' },
    { id: 'recusa_pontual', label: 'Recusa Pontual', descricao: 'Recusa isolada de refeições num dia' },
    { id: 'alteracao_persistente', label: 'Alteração Persistente', descricao: 'Mudança consistente no padrão alimentar' }
  ];

  return (
    <Card className="border-2 border-dashed border-purple-300 bg-purple-50/50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-purple-600" />
            <div>
              <div className="font-semibold text-gray-900">Modo de Desenvolvimento</div>
              <div className="text-xs text-gray-600">Protótipo e simulação de cenários</div>
            </div>
          </div>
          <Button
            variant={modoSimulacao ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className={modoSimulacao ? "bg-purple-600 hover:bg-purple-700" : ""}
          >
            {modoSimulacao ? (
              <>
                <Beaker className="w-4 h-4 mr-2" />
                Simulação Ativa
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Dados Reais
              </>
            )}
          </Button>
        </div>

        {modoSimulacao && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Cenário de Teste:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {cenarios.map(cenario => (
                <button
                  key={cenario.id}
                  onClick={() => onCenarioChange(cenario.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    cenarioAtual === cenario.id
                      ? 'border-purple-500 bg-purple-100'
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">{cenario.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{cenario.descricao}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}