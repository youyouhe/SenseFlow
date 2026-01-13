import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Play, Clock, Tag, Download, Sparkles, Loader2, Plus, ChevronRight, Wand2, Dices } from 'lucide-react';
import { Button } from './ui/Button';
import { StudyMaterial, Chunk, ProviderType } from '../types';
import { translations } from '../services/translations';
import { GoogleGenAI } from "@google/genai";

// --- Helper: Post-processing to simulate timestamps based on text length ---
const processGeneratedContent = (
  raw: any, 
  provider: ProviderType
): StudyMaterial => {
  // Handle both old format (string[]) and new format ({text, translation}[])
  const rawChunks = raw.chunks || raw.chunk_texts || [];
  
  // Simulate timing: avg speaking rate ~150 words/min = ~2.5 words/sec
  // We'll use character count as a proxy for simpler estimation (approx 15 chars per sec for speaking speed)
  const CHARS_PER_SEC = 12; 
  
  let currentTime = 0;
  const processedChunks: Chunk[] = rawChunks.map((item: any, idx: number) => {
    // Determine text and translation based on format
    const text = typeof item === 'string' ? item : item.text;
    const translation = typeof item === 'object' ? item.translation : undefined;

    const duration = Math.max(1.5, text.length / CHARS_PER_SEC); // Min 1.5s per chunk
    const start = currentTime;
    const end = start + duration;
    currentTime = end;
    
    return {
      id: `gen_${Date.now()}_${idx}`,
      text: text,
      translation: translation,
      start_time: Number(start.toFixed(2)),
      end_time: Number(end.toFixed(2))
    };
  });

  return {
    id: `gen_${Date.now()}`,
    title: raw.title || 'Untitled Session',
    description: raw.description || 'AI Generated content.',
    original_text: raw.original_text || processedChunks.map(c => c.text).join(' '),
    chunks: processedChunks,
    duration: Number(currentTime.toFixed(2)),
    config: {
      recommended_speed: 1.0,
      recommended_noise_level: 0.2,
      provider_type: provider,
      tags: raw.tags || ['AI Generated'],
      difficulty: raw.difficulty || 'Medium'
    }
  };
};

export const Library = ({ onViewPlayer }: { onViewPlayer: () => void }) => {
  const { materials, setMaterial, addMaterial, settings } = useStore();
  const t = translations[settings.language];
  
  // Generator State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlay = (id: string) => {
    setMaterial(id);
    onViewPlayer();
  };

  const difficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Hard': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Insane': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default: return 'text-zinc-400';
    }
  };

  const generateContent = async (mode: 'topic' | 'random') => {
    setError(null);
    setIsGenerating(true);

    try {
      // 1. Determine Provider and API Key
      const envApiKey = process.env.API_KEY;
      
      let provider: ProviderType | null = null;
      let apiKey = '';
      
      if (settings.openaiKey) {
        provider = 'openai';
        apiKey = settings.openaiKey;
      } else if (settings.deepseekKey) {
        provider = 'deepseek';
        apiKey = settings.deepseekKey;
      } else if (settings.geminiKey || envApiKey) {
        provider = 'gemini';
        apiKey = settings.geminiKey || envApiKey || '';
      }

      if (!provider || !apiKey) {
        throw new Error(t.err_no_key);
      }

      // 2. Construct Prompt based on mode
      let promptTaskDesc = "";
      
      if (mode === 'random') {
        promptTaskDesc = `
        Task: 
        1. Randomly select an interesting, specific topic. It could be anything from "The philosophy of minimalism" to "How a coffee machine works", "A cyberpunk detective story snippet", or "A casual chat about the weather on Mars". Be creative!
        2. Randomly assign a Difficulty level (Easy, Medium, Hard, or Insane) appropriate for the topic.
        3. Create a speech or dialogue in English based on this topic.
        `;
      } else {
        promptTaskDesc = `
        Task: Create a speech/dialogue in English about "${topic}" (Difficulty: ${difficulty}).
        `;
      }

      const systemPrompt = `You are an expert linguist and English teacher specializing in "Sense Group Phrasing" (Chunking) and "Sight Translation".

      ${promptTaskDesc}
      
      ### 1. Chunking Rules (Segmentation)
      Divide the text into meaningful "Sense Groups" or "Chunks" based on the following principles:
      - **Syntactic Boundaries:** Split before prepositions (in, on, at, for...), conjunctions (and, but, because...), relative pronouns (that, which, who...), and infinitives (to do).
      - **Breath Groups:** Mimic the natural rhythm of a native speaker's speech.
      - **Length Balance:** Avoid chunks that are too long (>10 words) or too short (1 word), unless necessary for emphasis.
      - **Logical Integrity:** Keep fixed phrases (idioms) and subject-verb structures intact if they are short.

      ### 2. Translation Rules (Direct Translation)
      Provide a Chinese translation for **each specific chunk**, NOT the whole sentence.
      - **Pedagogical Translation:** The translation must follow the English word order (Linear Translation/Direct Translation).
      - **Match the Chunk:** If the chunk is a prepositional phrase (e.g., "in the room"), translate it as "在房间里", not as part of a rearranged sentence.

      ### 3. Output Format
      Return strictly VALID JSON. No markdown formatting.
      Structure:
      {
        "title": "String (English title)",
        "description": "String (English description with brief Chinese summary)",
        "original_text": "The full generated English text",
        "difficulty": "Easy" | "Medium" | "Hard" | "Insane",
        "tags": ["Tag1", "Tag2"],
        "chunks": [
          { "text": "English text snippet", "translation": "Corresponding Chinese meaning" }
        ]
      }

      ### Few-Shot Examples (Follow this style STRICTLY for the chunks):
      
      **Example 1:**
      Input: "And we're ready to start on a new era in international cooperation in space."
      Chunks Output:
      [
        {"text": "And we're ready", "translation": "我们已经准备好"},
        {"text": "to start on a new era", "translation": "去开启一个新纪元"},
        {"text": "in international cooperation", "translation": "在国际合作方面"},
        {"text": "in space", "translation": "在太空领域"}
      ]

      **Example 2:**
      Input: "Making it significantly easier for developers to build applications."
      Chunks Output:
      [
        {"text": "Making it significantly easier", "translation": "使其变得极其容易"},
        {"text": "for developers", "translation": "对开发者来说"},
        {"text": "to build applications", "translation": "去构建应用程序"}
      ]
      `;
      
      let jsonContent;

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        
        if (!response.text) {
          throw new Error("No content generated");
        }
        jsonContent = JSON.parse(response.text);

      } else {
        let url = '';
        if (provider === 'openai') {
          url = 'https://api.openai.com/v1/chat/completions';
        } else if (provider === 'deepseek') {
          url = 'https://api.deepseek.com/chat/completions';
        }

        const body = JSON.stringify({
          model: provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat',
          messages: [
            { role: "system", content: "You are a helpful assistant that outputs JSON." },
            { role: "user", content: systemPrompt }
          ],
          response_format: { type: "json_object" }
        });

        const response = await fetch(url, { 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }, 
          body 
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`${t.err_api_fail}: ${response.status} - ${err}`);
        }

        const data = await response.json();
        jsonContent = JSON.parse(data.choices[0].message.content);
      }

      const newMaterial = processGeneratedContent(jsonContent, provider);
      addMaterial(newMaterial);
      setIsGeneratorOpen(false);
      setTopic('');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in pb-24">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">{t.lib_title}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t.lib_subtitle}</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2">
             <Download className="w-4 h-4" /> 
             {t.lib_import}
           </Button>
           <Button variant="outline" className="gap-2" onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}>
             <Sparkles className="w-4 h-4 text-accent" />
             {t.lib_workshop_btn}
           </Button>
        </div>
      </div>

      {/* AI Generator Panel */}
      {isGeneratorOpen && (
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-secondary border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-6 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300 shadow-xl shadow-indigo-500/5">
           <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{t.lib_gen_title}</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">{t.lib_gen_topic}</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t.lib_gen_topic_ph}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2.5 px-4 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">{t.lib_gen_diff}</label>
                <select 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-lg py-2.5 px-4 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-colors"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Insane</option>
                </select>
              </div>
           </div>

           {error && (
             <div className="text-rose-500 text-sm bg-rose-50 dark:bg-rose-500/10 p-2 rounded border border-rose-200 dark:border-rose-500/20">
               {error}
             </div>
           )}

           <div className="flex flex-col md:flex-row justify-end gap-3 pt-2">
             {/* Random Button */}
             <Button 
                onClick={() => generateContent('random')} 
                disabled={isGenerating} 
                variant="secondary"
                className="gap-2 w-full md:w-auto"
              >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
               {isGenerating ? t.lib_gen_btn_loading : t.lib_gen_btn_random}
             </Button>

             {/* Specific Generate Button */}
             <Button 
                onClick={() => generateContent('topic')} 
                disabled={isGenerating || !topic.trim()} 
                className="gap-2 w-full md:w-auto min-w-[140px]"
              >
               {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               {isGenerating ? t.lib_gen_btn_loading : t.lib_gen_btn_create}
             </Button>
           </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((item) => (
          <div 
            key={item.id} 
            className="group bg-surface rounded-xl border border-border p-5 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:bg-zinc-800/50 hover:bg-zinc-50 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
          >
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${difficultyColor(item.config.difficulty)}`}>
                {item.config.difficulty}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 bg-secondary border border-border px-2 py-1 rounded flex items-center gap-1.5">
                {item.config.provider_type === 'gemini' && <Sparkles className="w-3 h-3 text-sky-400" />}
                {item.config.provider_type}
              </span>
            </div>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors relative z-10">
              {item.title}
            </h3>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 flex-grow line-clamp-2 relative z-10">
              {item.description}
            </p>

            <div className="space-y-4 relative z-10">
              <div className="flex flex-wrap gap-2">
                {item.config.tags.slice(0, 3).map(tag => (
                  <div key={tag} className="flex items-center text-xs text-zinc-500 dark:text-zinc-400 bg-secondary px-2 py-1 rounded">
                    <Tag className="w-3 h-3 mr-1 opacity-50" />
                    {tag}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                <div className="flex items-center text-zinc-500 dark:text-zinc-400 text-sm font-mono">
                  <Clock className="w-4 h-4 mr-1.5 text-zinc-400" />
                  {item.duration}s
                </div>
                <Button onClick={() => handlePlay(item.id)} size="sm" className="gap-1 pl-4 pr-3">
                  {t.lib_start}
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};