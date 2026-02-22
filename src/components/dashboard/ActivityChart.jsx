import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export default function ActivityChart({ dados, isLoading }) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Movimento ao longo do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dados || dados.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Movimento ao longo do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Ainda não há dados de movimento para hoje</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dadosGrafico = dados
    .sort((a, b) => a.hora - b.hora)
    .map(d => ({
      hora: `${d.hora}:00`,
      movimento: d.intensidade_movimento || 0,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const intensidade = payload[0].value;
      let nivel = 'Em repouso';
      let cor = 'text-purple-600';
      
      if (intensidade > 70) { nivel = 'Muito ativo'; cor = 'text-green-600'; }
      else if (intensidade > 50) { nivel = 'Moderadamente ativo'; cor = 'text-blue-600'; }
      else if (intensidade > 25) { nivel = 'Calmo'; cor = 'text-amber-600'; }

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {payload[0].payload.hora}
          </p>
          <p className={`text-lg font-bold ${cor}`}>
            {nivel}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Movimento ao longo do dia</CardTitle>
        <p className="text-sm text-gray-500">
          Quanto mais alto, maior a atividade
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dadosGrafico}>
            <defs>
              <linearGradient id="colorMovimento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="hora" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="movimento"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorMovimento)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}