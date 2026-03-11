import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Sparkles } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 🔑 Add your Anthropic API key here, or better yet, store it
//    in a .env file as VITE_ANTHROPIC_API_KEY and reference it
//    as import.meta.env.VITE_ANTHROPIC_API_KEY
// ─────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

const sugestoesPadrao = [
  "Como foi o dia hoje?",
  "Houve alguma alteração na rotina?",
  "O movimento está normal?"
];

export default function AIAssistant({ residente, atividadeHoje, estabilidade, classificacao, onClose }) {
  const [mensagens, setMensagens] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const enviarPergunta = async (pergunta) => {
    const novaPergunta = { role: 'user', content: pergunta };
    setMensagens(prev => [...prev, novaPergunta]);
    setInput('');
    setLoading(true);

    try {
      const contexto = `
Estás a analisar dados de movimento do/a ${residente.nome}.

Dados de hoje:
- Classificação: ${classificacao}
- Índice de estabilidade: ${estabilidade?.valor || 'N/A'}/100 (${estabilidade?.texto || 'N/A'})
- Períodos registados: ${atividadeHoje?.length || 0}

Responde SEMPRE seguindo esta estrutura obrigatória:

📋 **Resumo simples**
[1-2 frases sobre o estado geral]

🔍 **Interpretação**
[Explicação em linguagem simples]

📊 **Comparação com o habitual**
[Comparação apenas com o histórico desta pessoa]

✅ **Estado geral**: [Verde/Amarelo/Laranja/Vermelho]

📈 **Índice de estabilidade**: ${estabilidade?.valor || 'N/A'}/100

🎯 **Nível de confiança**: [Sem sinais de alteração / Pequena alteração / Alteração moderada / Alteração significativa]

❓ **Perguntas sugeridas**:
1. [pergunta relevante]
2. [pergunta relevante]
3. [pergunta relevante]

REGRAS CRÍTICAS:
- Linguagem simples, empática, não técnica
- Nunca fazer diagnósticos médicos
- Nunca criar alarmismo
- Sempre comparar apenas com o histórico desta pessoa
- Se dados insuficientes, declarar claramente
      `.trim();

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          // NOTE: Direct API calls from the browser expose your API key to users.
          // For production, proxy this request through your own backend server.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: contexto,
          messages: [
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
        content: 'Desculpe, não consegui processar a sua pergunta neste momento. Por favor, tente novamente.',
      };
      setMensagens(prev => [...prev, erroMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-full max-w-2xl max-h-[600px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">Assistente de Acompanhamento</CardTitle>
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
              Faça perguntas sobre a atividade do seu familiar
            </p>
            <div className="space-y-2">
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
          mensagens.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}

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
      </CardContent>

      <div className="border-t p-4">
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
