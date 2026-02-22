import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Database } from 'lucide-react';

export default function ModoToggle() {
  const [modoDemo, setModoDemo] = useState(() => {
    return localStorage.getItem('app_modo') === 'demo';
  });

  const toggleModo = () => {
    const novoModo = !modoDemo;
    setModoDemo(novoModo);
    localStorage.setItem('app_modo', novoModo ? 'demo' : 'real');
    window.location.reload();
  };

  return (
    <Card className={`border-2 ${modoDemo ? 'border-purple-300 bg-purple-50' : 'border-blue-300 bg-blue-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {modoDemo ? (
              <Sparkles className="w-5 h-5 text-purple-600" />
            ) : (
              <Database className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {modoDemo ? 'Modo Demonstração' : 'Seus Dados Reais'}
              </div>
              <div className="text-xs text-gray-600">
                {modoDemo ? 'Dados de exemplo para testar a aplicação' : 'Análise dos seus dados carregados'}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleModo}
            className="whitespace-nowrap"
          >
            {modoDemo ? 'Ver Meus Dados' : 'Ver Demo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function useModoApp() {
  const [modoDemo, setModoDemo] = useState(() => {
    return localStorage.getItem('app_modo') === 'demo';
  });

  useEffect(() => {
    const checkModo = () => {
      setModoDemo(localStorage.getItem('app_modo') === 'demo');
    };
    window.addEventListener('storage', checkModo);
    return () => window.removeEventListener('storage', checkModo);
  }, []);

  return modoDemo;
}