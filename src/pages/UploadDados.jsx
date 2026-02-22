import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const tiposUpload = [
  {
    id: 'movimento',
    label: 'Dados de Movimento',
    entity: 'RegistoAtividade',
    icon: '📊',
    descricao: 'CSV com: residente_id, data, hora, intensidade_movimento, picos_movimento, minutos_inatividade',
    exemplo: 'residente_id,data,hora,intensidade_movimento,picos_movimento,minutos_inatividade\n6991bad31c3dd5aecee47312,2026-02-17,10,75,12,5'
  },
  {
    id: 'alimentacao',
    label: 'Dados de Alimentação',
    entity: 'RegistoAlimentacao',
    icon: '🍽️',
    descricao: 'CSV com: residente_id, data, refeicao, nivel_ingestao',
    exemplo: 'residente_id,data,refeicao,nivel_ingestao\n6991bad31c3dd5aecee47312,2026-02-17,almoco,normal'
  },
  {
    id: 'consultas',
    label: 'Áudio de Consultas',
    entity: 'Consulta',
    icon: '🩺',
    descricao: 'Ficheiro de áudio (mp3, wav, m4a) de consulta médica',
    exemplo: null
  }
];

export default function UploadDados() {
  const [user, setUser] = useState(null);
  const [tipoSelecionado, setTipoSelecionado] = useState(null);
  const [ficheiro, setFicheiro] = useState(null);
  const [residenteId, setResidenteId] = useState('');
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      return userData;
    }
  });

  const { data: residentes = [] } = useQuery({
    queryKey: ['residentes-all'],
    queryFn: () => base44.entities.Residente.list(),
    enabled: !!user
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFicheiro(file);
    setResultado(null);
  };

  const processarUpload = async () => {
    if (!ficheiro || !tipoSelecionado || !residenteId) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setProcessando(true);
    setResultado(null);

    try {
      // 1. Upload do ficheiro
      const { file_url } = await base44.integrations.Core.UploadFile({ file: ficheiro });

      if (tipoSelecionado.id === 'consultas') {
        // Processar áudio de consulta
        toast.info('A transcrever áudio... Isto pode demorar alguns segundos.');
        
        const transcricao = await base44.integrations.Core.InvokeLLM({
          prompt: 'Transcreve este áudio de consulta médica em português de forma detalhada e estruturada.',
          file_urls: [file_url]
        });

        const analise = await base44.integrations.Core.InvokeLLM({
          prompt: `Analisa esta transcrição de consulta médica e extrai:
          - Resumo claro para familiares
          - Temas principais discutidos
          - Recomendações médicas
          - Próximos passos
          
          Transcrição: ${transcricao}`,
          response_json_schema: {
            type: 'object',
            properties: {
              resumo_ia: { type: 'string' },
              temas_principais: { type: 'array', items: { type: 'string' } },
              recomendacoes: { type: 'array', items: { type: 'string' } },
              proximos_passos: { type: 'string' }
            }
          }
        });

        await base44.entities.Consulta.create({
          residente_id: residenteId,
          data_consulta: new Date().toISOString().split('T')[0],
          tipo_consulta: 'rotina',
          audio_url: file_url,
          transcricao,
          ...analise,
          carregado_por: user.email
        });

        setResultado({
          sucesso: true,
          mensagem: 'Consulta processada com sucesso',
          detalhes: { registos: 1 }
        });

      } else {
        // Processar CSV (movimento ou alimentação)
        const schema = tipoSelecionado.id === 'movimento' ? {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              residente_id: { type: 'string' },
              data: { type: 'string' },
              hora: { type: 'number' },
              intensidade_movimento: { type: 'number' },
              picos_movimento: { type: 'number' },
              minutos_inatividade: { type: 'number' }
            }
          }
        } : {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              residente_id: { type: 'string' },
              data: { type: 'string' },
              refeicao: { type: 'string' },
              nivel_ingestao: { type: 'string' }
            }
          }
        };

        const extraido = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: schema
        });

        if (extraido.status === 'error') {
          throw new Error(extraido.details || 'Erro ao processar ficheiro');
        }

        // Filtrar apenas registos do residente selecionado
        const registosFiltrados = extraido.output.filter(r => r.residente_id === residenteId);

        if (registosFiltrados.length === 0) {
          toast.error('Nenhum registo encontrado para este residente');
          setProcessando(false);
          return;
        }

        // Inserir em bulk
        if (tipoSelecionado.id === 'movimento') {
          await base44.entities.RegistoAtividade.bulkCreate(registosFiltrados);
        } else {
          const registosComEmail = registosFiltrados.map(r => ({
            ...r,
            registado_por: user.email
          }));
          await base44.entities.RegistoAlimentacao.bulkCreate(registosComEmail);
        }

        setResultado({
          sucesso: true,
          mensagem: `${registosFiltrados.length} registos importados com sucesso`,
          detalhes: { registos: registosFiltrados.length }
        });

        queryClient.invalidateQueries();
      }

      toast.success('Upload concluído!');
      setFicheiro(null);
      
    } catch (error) {
      console.error(error);
      setResultado({
        sucesso: false,
        mensagem: 'Erro ao processar ficheiro',
        detalhes: { erro: error.message }
      });
      toast.error('Erro ao processar ficheiro');
    } finally {
      setProcessando(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload de Dados</h1>
        <p className="text-sm text-gray-500 mt-1">Importação rápida de dados em massa</p>
      </div>

      {/* Seleção de Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiposUpload.map(tipo => (
          <button
            key={tipo.id}
            onClick={() => setTipoSelecionado(tipo)}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              tipoSelecionado?.id === tipo.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 bg-white'
            }`}
          >
            <div className="text-4xl mb-3">{tipo.icon}</div>
            <div className="font-semibold text-gray-900 mb-2">{tipo.label}</div>
            <div className="text-xs text-gray-600">{tipo.descricao}</div>
          </button>
        ))}
      </div>

      {tipoSelecionado && (
        <Card>
          <CardHeader>
            <CardTitle>Importar {tipoSelecionado.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleção de Residente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Residente
              </label>
              <select
                value={residenteId}
                onChange={(e) => setResidenteId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Selecione um residente</option>
                {residentes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nome} - Quarto {r.quarto}
                  </option>
                ))}
              </select>
            </div>

            {/* Upload de Ficheiro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ficheiro
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={tipoSelecionado.id === 'consultas' ? 'audio/*' : '.csv,.json'}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-sm text-gray-600">
                    {ficheiro ? (
                      <span className="text-blue-600 font-medium">{ficheiro.name}</span>
                    ) : (
                      <>Clique para selecionar ou arraste o ficheiro</>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {tipoSelecionado.id === 'consultas' ? 'MP3, WAV, M4A' : 'CSV ou JSON'}
                  </div>
                </label>
              </div>
            </div>

            {/* Exemplo */}
            {tipoSelecionado.exemplo && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs font-medium text-gray-700 mb-2">Exemplo de CSV:</div>
                <pre className="text-xs text-gray-600 overflow-x-auto">
                  {tipoSelecionado.exemplo}
                </pre>
              </div>
            )}

            {/* Botão */}
            <Button
              onClick={processarUpload}
              disabled={!ficheiro || !residenteId || processando}
              className="w-full"
              size="lg"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Dados
                </>
              )}
            </Button>

            {/* Resultado */}
            {resultado && (
              <div className={`p-4 rounded-lg ${
                resultado.sucesso ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {resultado.sucesso ? (
                    <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className={`font-medium ${resultado.sucesso ? 'text-green-900' : 'text-red-900'}`}>
                      {resultado.mensagem}
                    </div>
                    {resultado.detalhes && (
                      <div className="text-sm text-gray-600 mt-1">
                        {resultado.detalhes.registos && `${resultado.detalhes.registos} registos processados`}
                        {resultado.detalhes.erro && `Erro: ${resultado.detalhes.erro}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}