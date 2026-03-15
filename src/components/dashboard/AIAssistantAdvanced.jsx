import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Sparkles } from 'lucide-react';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `
És um assistente de apoio a familiares de pessoas que vivem num lar de idosos chamado Monilar.
O teu papel é ajudar os familiares a perceber como está o seu familiar, de forma simples, calorosa e tranquilizadora.

COMO DEVES RESPONDER:
- Fala como uma pessoa amiga e empática, não como um sistema informático
- Usa frases curtas e simples, sem jargão técnico
- Nunca uses emojis nem formatação com asteriscos ou títulos — responde em texto corrido normal
- Se há poucos dados, diz isso de forma natural, por exemplo: "Hoje ainda não temos muita informação sobre o dia da Rosa, mas pelo que sabemos da semana..."
- Nunca faças diagnósticos médicos
- Nunca sejas alarmista — se algo parece preocupante, sugere falar com a equipa do lar
- Mantém sempre um tom positivo e reconfortante
- As respostas devem ter entre 3 a 6 frases — nem demasiado curtas nem demasiado longas
- No final podes sugerir uma ou duas perguntas que o familiar pode fazer, de forma natural, por exemplo: "Se quiser pode também perguntar-me sobre..."
- Responde sempre em português de Portugal
`;

const sugestoesPadrao = [
  "Como foi o dia hoje?",
  "O apetite está normal?",
  "Como está em relação às consultas?",
  "Houve alterações esta semana?",
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  const enviarPergunta = async (pergunta) => {
    setMensagens(prev => [...prev, { role: 'user', content: pergunta }]);
    setInput('');
    setLoading(true);

    try {
      const mediaMovimento = atividadeHoje?.length > 0
        ? atividadeHoje.reduce((sum, a) => sum + (a.intensidade_movimento || 0), 0) / atividadeHoje.length
        : null;

      const mediaMovimentoSemana = atividadeSemana?.length > 0
        ? atividadeSemana.reduce((sum, a) => sum + (a.intensidade_movimento || 0), 0) / atividadeSemana.length
        : null;
      
      const calcularApetite = (registos) => {
        if (!registos || registos.length === 0) return null;
        const valor = registos.reduce((sum, r) => {
          if (r.nivel_ingestao === 'normal') return sum + 100;
          if (r.nivel_ingestao === 'parcial') return sum + 50;
          return sum;
        }, 0) / registos.length;
        if (valor >= 80) return 'bom';
        if (valor >= 50) return 'razoável';
        return 'fraco';
      };

      const nome = residente?.nome || 'o residente';
      const partes = [];

      partes.push(`O familiar que está a acompanhar chama-se ${nome}.`);

      if (mediaMovimento !== null) {
        partes.push(`Hoje, a atividade de ${nome} está ${mediaMovimento > (residente?.baseline_atividade || 50) ? 'acima' : 'abaixo'} do habitual, com uma intensidade média de ${mediaMovimento.toFixed(0)}.`);
      } else {
        partes.push(`Hoje ainda não há registos de atividade de ${nome}.`);
      }

      if (mediaMovimentoSemana !== null) {
        partes.push(`Esta semana, a média de atividade foi de ${mediaMovimentoSemana.toFixed(0)}, com ${atividadeSemana.length} registos.`);
      }

      const apetiteHoje = calcularApetite(alimentacaoHoje);
      const apetiteSemana = calcularApetite(alimentacaoSemana);

      if (apetiteHoje) {
        partes.push(`O apetite hoje está ${apetiteHoje} — fez ${alimentacaoHoje.length} refeições.`);
      } else {
        partes.push(`Hoje ainda não há registo de refeições.`);
      }

      if (apetiteSemana) {
        partes.push(`Ao longo desta semana, o apetite tem estado ${apetiteSemana}.`);
      }

      if (estabilidade?.valor) {
        partes.push(`O índice de estabilidade geral é de ${estabilidade.valor}/100 (${estabilidade.texto}).`);
      }

      if (consulta) {
        partes.push(`A última consulta foi em ${new Date(consulta.data_consulta).toLocaleDateString('pt-PT')}. ${consulta.resumo_ia || ''}`);
      }

      const contexto = partes.join(' ');

      const historicoMensagens = mensagens.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 512,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + '\n\nInformação disponível: ' + contexto },
            ...historicoMensagens,
            { role: 'user', content: pergunta }
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq error:', errorData);
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const resposta = data.choices?.[0]?.message?.content || 'Não foi possível obter uma resposta.';

      setMensagens(prev => [...prev, { role: 'assistant', content: resposta }]);
    } catch (error) {
      console.error('Erro ao chamar Groq:', error);
      setMensagens(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, não consegui processar a sua pergunta neste momento. Por favor tente novamente.' 
      }]);
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
            <h3 className="text-lg font-medium text-gray-700 mb-2">Como posso ajudar?</h3>
            <p className="text-sm text-gray-500 mb-6">Faça perguntas sobre o bem-estar do seu familiar</p>
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
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
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
        <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) enviarPergunta(input); }} className="flex gap-2">
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