import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, FileAudio, Upload, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// 🔑 API Keys — add these to your .env file:
//    VITE_ANTHROPIC_API_KEY=...   (for AI analysis)
//    VITE_OPENAI_API_KEY=...      (for audio transcription)
// ─────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ── Transcribe audio using OpenAI Whisper ───────────────────
const transcribeAudio = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) throw new Error('Erro na transcrição do áudio');
  const data = await response.json();
  return data.text;
};

// ── Analyse transcription using Anthropic Claude ────────────
const analyseTranscription = async (transcricao) => {
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
      messages: [{
        role: 'user',
        content: `
Analisa esta transcrição de uma consulta médica e devolve um resumo estruturado em linguagem simples e acessível para familiares.

Transcrição:
${transcricao}

Devolve APENAS um JSON válido com esta estrutura, sem mais nenhum texto:
{
  "resumo_ia": "Resumo simples e claro da consulta (2-3 parágrafos)",
  "temas_principais": ["tema 1", "tema 2", "tema 3"],
  "recomendacoes": ["recomendação 1", "recomendação 2"],
  "proximos_passos": "Descrição dos próximos passos mencionados"
}
        `.trim()
      }]
    }),
  });

  if (!response.ok) throw new Error('Erro na análise da consulta');
  const data = await response.json();
  const text = data.content?.[0]?.text || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

export default function Consultas() {
  const [user, setUser] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const [expandedConsulta, setExpandedConsulta] = useState(null);

  const [formData, setFormData] = useState({
    data_consulta: new Date().toISOString().split('T')[0],
    tipo_consulta: 'rotina',
    especialidade: '',
    notas_adicionais: '',
    audio_file: null
  });

  const queryClient = useQueryClient();

  // ── Auth ────────────────────────────────────────────────────
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { window.location.href = '/login'; return null; }
      setUser(user);
      const role = user.user_metadata?.role;
      setIsStaff(role === 'admin' || role === 'staff');
      return user;
    }
  });

  // ── Ligação Familiar ────────────────────────────────────────
  const { data: ligacao } = useQuery({
    queryKey: ['ligacao', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('LigacaoFamiliar')
        .select('*')
        .eq('familiar_email', user.email)
        .eq('status', 'aprovado')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  // ── Residente ───────────────────────────────────────────────
  const { data: residente } = useQuery({
    queryKey: ['residente', ligacao?.residente_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Residente')
        .select('*')
        .eq('id', ligacao.residente_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ligacao?.residente_id,
  });

  // ── Consultas ───────────────────────────────────────────────
  const { data: consultas = [], isLoading } = useQuery({
    queryKey: ['consultas', residente?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Consulta')
        .select('*')
        .eq('residente_id', residente.id)
        .order('data_consulta', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!residente?.id,
  });

  // ── Upload + Process Mutation ───────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Upload audio to Supabase Storage
      setUploadingAudio(true);
      const fileName = `${Date.now()}-${data.audio_file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('consultas-audio')
        .upload(fileName, data.audio_file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('consultas-audio')
        .getPublicUrl(fileName);
      setUploadingAudio(false);

      // 2. Transcribe audio with OpenAI Whisper
      setProcessingAudio(true);
      const transcricao = await transcribeAudio(data.audio_file);

      // 3. Analyse transcription with Claude
      const analise = await analyseTranscription(transcricao);
      setProcessingAudio(false);

      // 4. Save to Supabase
      const { data: consulta, error: insertError } = await supabase
        .from('Consulta')
        .insert({
          residente_id: residente.id,
          data_consulta: data.data_consulta,
          tipo_consulta: data.tipo_consulta,
          especialidade: data.especialidade,
          audio_url: publicUrl,
          transcricao,
          resumo_ia: analise.resumo_ia,
          temas_principais: analise.temas_principais,
          recomendacoes: analise.recomendacoes,
          proximos_passos: analise.proximos_passos,
          carregado_por: user.email,
          notas_adicionais: data.notas_adicionais,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      return consulta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultas'] });
      setShowUploadForm(false);
      setFormData({
        data_consulta: new Date().toISOString().split('T')[0],
        tipo_consulta: 'rotina',
        especialidade: '',
        notas_adicionais: '',
        audio_file: null
      });
      toast.success('Consulta carregada e analisada com sucesso!');
    },
    onError: (err) => {
      console.error(err);
      toast.error('Erro ao processar consulta. Tente novamente.');
      setUploadingAudio(false);
      setProcessingAudio(false);
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFormData(prev => ({ ...prev, audio_file: file }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.audio_file) {
      toast.error('Por favor, selecione um ficheiro de áudio');
      return;
    }
    uploadMutation.mutate(formData);
  };

  if (!residente) {
    return (
      <div className="p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultas Médicas</h1>
          <p className="text-sm text-gray-500 mt-1">{residente.nome}</p>
        </div>
        {isStaff && (
          <Button onClick={() => setShowUploadForm(!showUploadForm)}>
            <Upload className="w-4 h-4 mr-2" />
            Carregar Consulta
          </Button>
        )}
      </div>

      {/* Upload Form */}
      {isStaff && showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Consulta</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Data da Consulta</Label>
                  <Input
                    type="date"
                    value={formData.data_consulta}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_consulta: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Tipo de Consulta</Label>
                  <Select
                    value={formData.tipo_consulta}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_consulta: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rotina">Rotina</SelectItem>
                      <SelectItem value="especialidade">Especialidade</SelectItem>
                      <SelectItem value="urgencia">Urgência</SelectItem>
                      <SelectItem value="seguimento">Seguimento</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Especialidade (opcional)</Label>
                <Input
                  value={formData.especialidade}
                  onChange={(e) => setFormData(prev => ({ ...prev, especialidade: e.target.value }))}
                  placeholder="Ex: Cardiologia, Geriatria..."
                />
              </div>

              <div>
                <Label>Áudio da Consulta</Label>
                <Input type="file" accept="audio/*" onChange={handleFileChange} />
                {formData.audio_file && (
                  <p className="text-sm text-green-600 mt-1">✓ {formData.audio_file.name}</p>
                )}
              </div>

              <div>
                <Label>Notas Adicionais (opcional)</Label>
                <Textarea
                  value={formData.notas_adicionais}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas_adicionais: e.target.value }))}
                  placeholder="Observações do funcionário..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowUploadForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploadMutation.isPending} className="min-w-32">
                  {uploadingAudio ? 'A carregar...' : processingAudio ? 'A analisar...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Consultas */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : consultas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileAudio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Ainda não há consultas registadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultas.map((consulta) => (
            <Card key={consulta.id} className="hover:shadow-lg transition-shadow">
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedConsulta(expandedConsulta === consulta.id ? null : consulta.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-lg">
                        {format(new Date(consulta.data_consulta), 'dd/MM/yyyy')}
                      </CardTitle>
                      <span className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        {consulta.tipo_consulta}
                      </span>
                      {consulta.especialidade && (
                        <span className="text-sm text-gray-500">• {consulta.especialidade}</span>
                      )}
                    </div>
                    {expandedConsulta !== consulta.id && consulta.resumo_ia && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                        {consulta.resumo_ia.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                  {expandedConsulta === consulta.id
                    ? <ChevronUp className="w-5 h-5 text-gray-400" />
                    : <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </CardHeader>

              {expandedConsulta === consulta.id && (
                <CardContent className="space-y-4">
                  {consulta.resumo_ia && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-blue-900">Resumo da Consulta</h4>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {consulta.resumo_ia}
                      </p>
                    </div>
                  )}

                  {consulta.temas_principais?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Temas Abordados</h4>
                      <div className="flex flex-wrap gap-2">
                        {consulta.temas_principais.map((tema, idx) => (
                          <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                            {tema}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {consulta.recomendacoes?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Recomendações</h4>
                      <ul className="space-y-2">
                        {consulta.recomendacoes.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-600 mt-0.5">✓</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {consulta.proximos_passos && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Próximos Passos</h4>
                      <p className="text-sm text-gray-700">{consulta.proximos_passos}</p>
                    </div>
                  )}

                  {consulta.audio_url && (
                    <div className="pt-4 border-t">
                      <audio controls className="w-full">
                        <source src={consulta.audio_url} />
                      </audio>
                    </div>
                  )}

                  {consulta.notas_adicionais && (
                    <div className="text-xs text-gray-500 pt-2 border-t">
                      <strong>Notas:</strong> {consulta.notas_adicionais}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
