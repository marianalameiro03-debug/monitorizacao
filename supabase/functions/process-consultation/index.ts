/**
 * process-consultation
 *
 * Downloads a consultation audio file from Supabase Storage, transcribes it
 * with OpenAI Whisper, then analyses it with Anthropic Claude.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   OPENAI_API_KEY
 *   ANTHROPIC_API_KEY
 *
 * Called from the frontend with:
 *   supabase.functions.invoke('process-consultation', { body: { storagePath } })
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the calling user ──────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Require staff or admin role ─────────────────────────
    const role = user.user_metadata?.role;
    if (role !== 'admin' && role !== 'staff') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 3. Download audio from private storage ─────────────────
    const { storagePath } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: 'storagePath is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('consultas-audio')
      .download(storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    // ── 4. Transcribe with OpenAI Whisper ──────────────────────
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('OPENAI_API_KEY secret not set');

    const formData = new FormData();
    formData.append('file', new File([fileBlob], storagePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const transcribeRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
    });
    if (!transcribeRes.ok) {
      const errText = await transcribeRes.text();
      throw new Error(`Whisper error: ${errText}`);
    }
    const { text: transcricao } = await transcribeRes.json();

    // ── 5. Analyse transcription with Anthropic Claude ─────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY secret not set');

    const analyseRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analisa esta transcrição de consulta médica e extrai:
- Resumo claro para familiares
- Temas principais discutidos
- Recomendações médicas
- Próximos passos

Transcrição: ${transcricao}

Devolve APENAS um JSON válido com esta estrutura, sem mais nenhum texto:
{
  "resumo_ia": "...",
  "temas_principais": ["...", "..."],
  "recomendacoes": ["...", "..."],
  "proximos_passos": "..."
}`,
        }],
      }),
    });
    if (!analyseRes.ok) {
      const errText = await analyseRes.text();
      throw new Error(`Anthropic error: ${errText}`);
    }
    const analyseData = await analyseRes.json();
    const rawText = analyseData.content?.[0]?.text ?? '{}';
    const analise = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    return new Response(JSON.stringify({ transcricao, ...analise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
