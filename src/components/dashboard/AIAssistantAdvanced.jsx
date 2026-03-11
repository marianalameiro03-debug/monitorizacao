import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Sparkles, TrendingUp, Calendar } from 'lucide-react';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `
És um assistente inteligente integrado numa aplicação privada de acompanhamento de um único residente num lar.
Cada utilizador tem acesso exclusivo aos dados do seu próprio familiar.

🔐 PRIVACIDADE E LIMITAÇÕES:
- Nunca referir outros residentes
- Nunca comparar com outras pessoas
- Comparar apenas com o histórico individual
- Nunca fazer diagnósticos médicos
- Nunca usar linguagem técnica (ex: SVM, variância, desvio padrão)
- Nunca gerar alarmismo
- Se não houver dados suficientes, indicar claramente

📊 ANÁLISE DE ATIVIDADE:
Classificar o dia como:
- Muito ativo
- Moderadamente ativo
- Mais calmo que o habitual
- Predominantemente em repouso
- Movimento irregular
- Evento brusco isolado

Índice de Estabilidade (0–100):
- 80–100 → Estável
- 60–79 → Pequenas variações
- 40–59 → Alterações moderadas
- 0–39 → Alterações significativas

Cores:
- Verde → Dentro do habitual
- Amarelo → Ligeira alteração
- Laranja → Moderada
- Vermelho → Significativa

🧩 ESTRUTURA DAS RESPOSTAS:

**📋 Resumo simples**
[1-2 frases sobre o estado geral]

**🔍 Interpretação**
[Explicação clara e acessível]

**📊 Comparação**
[Apenas com histórico desta pessoa]

**✅ Estado**: [Verde/Amarelo/Laranja/Vermelho]

**📈 Estabilidade**: [valor]/100

**🎯 Confiança**: [Sem sinais / Pequena alteração / Alteração moderada / Alteração significativa]

**❓ Pode perguntar**:
1. [pergunta relevante]
2. [pergunta relevante]
3. [pergunta relevante]

🗣 ESTILO:
- Claro, empático, tranquilo
- Humano, não técnico
- Não alarmista
- Centrado no familiar
`;

const sugestoesPadrao = [
  "Como foi o dia hoje?",
  "O apetite está normal?",
  "Como está em relação às consultas?",
  "Houve alterações esta semana?",
  "A alimentação está relacionada com a atividade?"
];

export default function AIAssistantAdvanced({ 
  residente, 
  atividadeHoje, 
  atividadeSemana,
  alimentacaoHoje = [],
  alimentacaoSemana = [],
  estabilidade, 
  classificacao, 
  onClose,
  consulta = null 
}) {
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const enviarPergunta = async (pergunta) => {
    const novaPergunta = { role: 'user', content: pergunta };
    setMensagens(prev => [...prev, novaPergunta]);
    setInput('');
    setLoading(true);

    try {
      const mediaMovimento = atividadeHoje?.reduce((sum, a) => sum + (a.intensidade_movimento || 0), 0) / (atividadeHoje?.length || 1);
      const mediaMovimentoSemana = atividadeSemana?.reduce((sum, a) => sum + (a.intensidade_movimento || 0), 0) / (atividadeSemana?.length || 1);
      
      const calcularApetite = (registos) => {
        if (!registos || registos.length === 0) return 'N/A';
        const valor = registos.reduce((sum, r) => {
          if (r.nivel_ingestao === 'normal') return sum + 100;
          if (r.nivel_ingestao === 'parcial') return sum + 50;
          return sum;
        }, 0) / registos.length;
        return valor.toFixed(0) + '%';
      };

      const apetiteHoje = calcularApetite(alimentacaoHoje);
      const apetiteSemana = calcularApetite(alimentacaoSemana);
      
      const contexto = `
📊 DADOS DO/A ${residente.nome}:

**Hoje (${new Date().toLocaleDateString('pt-PT')})**:
- Classificação: ${classificacao || 'N/A'}
- Índice de estabilidade: ${estabilidade?.valor || 'N/A'}/100 (${estabilidade?.texto || 'N/A'})
- Períodos registados: ${atividadeHoje?.length || 0}
- Intensidade média: ${mediaMovimento?.toFixed(1) || 'N/A'}
- Baseline habitual: ${residente.baseline_atividade || 'N/A'}

**Esta semana**:
- Registos totais: ${atividadeSemana?.length || 0}
- Intensidade média semanal: ${mediaMovimentoSemana?.toFixed(1) || 'N/A'}

**Alimentação**:
- Apetite hoje: ${apetiteHoje}
- Refeições hoje: ${alimentacaoHoje?.length || 0}/4
- Apetite médio da semana: ${apetiteSemana}
- Refeições semana: ${alimentacaoSemana?.length || 0}

${consulta ? `
**Última consulta médica (${new Date(consulta.data_consulta).toLocaleDateString('pt-PT')})**:
- Tipo: ${consulta.tipo_consulta}
- Especialidade: ${consulta.especialidade || 'N/A'}
- Resumo: ${consulta.resumo_ia || 'Disponível na secção Consultas'}
${consulta.recomendacoes?.length ? `- Recomendações: ${consulta.recomendacoes.join(', ')}` : ''}
` : ''}

**Histórico da conversa**:
${mensagens.slice(-4).map(m => `${m.role === 'user' ? 'Familiar' : 'Assistente'}: ${m.content}`).join('\n')}
      `.trim();

      // Build conversation history for multi-turn support
      const historicoMensagens = mensagens.slice(-8).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: SYSTEM_PROMPT + '\n\n' + contexto,
          messages: [
            ...historicoMensagens,
            { role: 'user', content: pergunta }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const data = await response.json();
      const resposta = data.content?.[0]?.text || 'Não foi possível obter uma resposta.';

      const novaResposta = { role: 'assistant', content: resposta };
      setMensagens(prev => [...prev, novaResposta]);
    } catch (error) {
      console.error('Erro ao chamar Claude:', error);
      const erroMsg = { 
        role: 'assistant', 
        content: '❌ Desculpe, não consegui processar a sua pergunta neste momento. Por favor, tente novamente.' 
      };
      setMensagens(prev => [...prev, erroMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed inset-4 md:bottom-4 md:right-4 md:left-auto md:w-full md:max-w-3xl max-h-[90vh] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">Assistente Interativo</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Como posso ajudar?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Faça perguntas sobre atividade, consultas ou bem-estar
            </p>
            <div className="space-y-2 max-w-md mx-auto">
              {sugestoesPadrao.map((sugestao, idx) => (
                <button
                  key={idx}
                  onClick={() => enviarPergunta(sugestao)}
                  className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {mensagens.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      <div className="border-t p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) enviarPergunta(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva a sua pergunta..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
