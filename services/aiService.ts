import {
  ProviderType,
  Chunk,
  StudyMaterial,
  AIServiceConfig,
  ContentType,
  SpeakerGender,
} from '../types'

export abstract class AIService {
  protected config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    this.config = config
  }

  abstract generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType,
    speakerGender?: SpeakerGender
  ): Promise<StudyMaterial>
  abstract generateAudio(text: string): Promise<ArrayBuffer>
}

export class OpenAIService extends AIService {
  async generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType = 'monologue',
    speakerGender: SpeakerGender = 'male-female'
  ): Promise<StudyMaterial> {
    const prompt = this.buildPrompt(topic, difficulty, contentType, speakerGender)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert linguist specializing in chunking for language learning. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = JSON.parse(data.choices[0].message.content)
    return this.processResponse(content, 'openai', contentType, speakerGender)
  }

  async generateAudio(text: string): Promise<ArrayBuffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy',
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI TTS error: ${response.status}`)
    }

    return response.arrayBuffer()
  }

  private buildPrompt(
    topic: string,
    difficulty: string,
    contentType: ContentType,
    speakerGender: SpeakerGender
  ): string {
    const speakerNames = {
      'male-male': { A: 'John', B: 'Mike' },
      'male-female': { A: 'John', B: 'Sarah' },
      'female-female': { A: 'Emma', B: 'Lisa' },
    }
    const names = speakerNames[speakerGender]

    if (contentType === 'dialogue') {
      return `You are an expert linguist creating chunked language learning dialogue content.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}
SPEAKER_GENDER: ${speakerGender}
SPEAKER_NAMES: Speaker A = "${names.A}" (${speakerGender.split('-')[0]}), Speaker B = "${names.B}" (${speakerGender.split('-')[1]})

CONTENT_TYPE: DIALOGUE

SPEAKER_REQUIREMENTS:
- Speaker A is "${names.A}" (${speakerGender.split('-')[0]} voice)
- Speaker B is "${names.B}" (${speakerGender.split('-')[1]} voice)
- Each chunk MUST include "speaker": "A" or "B" AND "speakerName": "${names.A}" or "${names.B}"
- Alternate between speakers naturally in a realistic conversation flow
- Keep dialogue chunks SHORT (2-6 words for natural speech)
- Include fillers like "Well", "Oh", "Yeah", "Hmm" as standalone chunks for realism
- Use natural turn-taking patterns (question → answer, statement → response)

CONTENT_CHUNKING_RULES:
1. Break into natural sense groups (3-8 words per chunk)
2. Each chunk should be a complete thought unit
3. Provide accurate Chinese translation for each chunk
4. Preserve natural conversation rhythm

OUTPUT_JSON_STRUCTURE:
{
  "title": "Engaging dialogue title",
  "description": "Brief description of the conversation scenario",
  "content_type": "dialogue",
  "original_text": "Full conversation transcript",
  "difficulty": "${difficulty}",
  "tags": ["${topic.toLowerCase().split(' ')[0] || 'dialogue'}", "${difficulty.toLowerCase()}"],
  "chunks": [
    {
      "speaker": "A",
      "speakerName": "${names.A}",
      "text": "English dialogue chunk",
      "translation": "中文翻译"
    }
  ]
}

FEW-SHOT EXAMPLES:

Example 1 (Easy - Ordering Food):
{
  "chunks": [
    {"speaker": "A", "speakerName": "John", "text": "Hi there.", "translation": "你好。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Welcome in!", "translation": "欢迎光临！"},
    {"speaker": "A", "speakerName": "John", "text": "One coffee please.", "translation": "请来一杯咖啡。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Sure thing.", "translation": "好的。"},
    {"speaker": "A", "speakerName": "John", "text": "How much?", "translation": "多少钱？"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Three dollars.", "translation": "三美元。"}
  ]
}

Example 2 (Medium - Job Interview):
{
  "chunks": [
    {"speaker": "A", "speakerName": "Mike", "text": "Thanks for coming.", "translation": "谢谢你前来面试。"},
    {"speaker": "B", "speakerName": "Emma", "text": "My pleasure.", "translation": "我的荣幸。"},
    {"speaker": "A", "speakerName": "Mike", "text": "Tell me about yourself.", "translation": "介绍一下你自己。"},
    {"speaker": "B", "speakerName": "Emma", "text": "I have five years experience.", "translation": "我有五年经验。"},
    {"speaker": "A", "speakerName": "Mike", "text": "Why this company?", "translation": "为什么选择我们？"},
    {"speaker": "B", "speakerName": "Emma", "text": "Great products.", "translation": "产品很棒。"}
  ]
}

Example 3 (Hard - Debate):
{
  "chunks": [
    {"speaker": "A", "speakerName": "John", "text": "The data is clear.", "translation": "数据很清楚。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "But costs matter.", "translation": "但成本很重要。"},
    {"speaker": "A", "speakerName": "John", "text": "Long-term costs are higher.", "translation": "长期成本更高。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "That's debatable.", "translation": "这有争议。"},
    {"speaker": "A", "speakerName": "John", "text": "Science doesn't debate.", "translation": "科学无需辩论。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Fair point.", "translation": "说得对。"}
  ]
}

Example 4 (Insane - Academic):
{
  "chunks": [
    {"speaker": "A", "speakerName": "Mike", "text": "The implications concern me.", "translation": "这些影响让我担忧。"},
    {"speaker": "B", "speakerName": "Emma", "text": "Which aspect specifically?", "translation": "具体是哪个方面？"},
    {"speaker": "A", "speakerName": "Mike", "text": "Cryptography vulnerabilities.", "translation": "密码学漏洞。"},
    {"speaker": "B", "speakerName": "Emma", "text": "Indeed a valid concern.", "translation": "确实是个问题。"},
    {"speaker": "A", "speakerName": "Mike", "text": "We need regulations now.", "translation": "需要立即监管。"},
    {"speaker": "B", "speakerName": "Emma", "text": "But innovation suffers.", "translation": "但创新会受阻。"}
  ]
}

CRITICAL RULES:
- For dialogue: "speaker" MUST be "A" or "B", "speakerName" MUST be "${names.A}" or "${names.B}"
- For monologue: "speaker" MUST be null, "speakerName" MUST be null
- Each chunk must have "text" and "translation"
- Keep chunks 3-8 words for optimal learning
- *** CRITICAL: "original_text" is the COMPLETE, UNMODIFIED source text ***
- *** CRITICAL: Each chunk["text"] MUST be extracted EXACTLY from original_text without any changes ***
- *** CRITICAL: When all chunks are joined with spaces, they must EXACTLY match original_text ***
- *** CRITICAL: NO additional words, NO paraphrasing, NO "enhancements" in chunks ***
- *** CRITICAL: Sense groups (chunks) are natural speech pauses, NOT grammatical sentences ***
- *** CRITICAL: Example: "I went to the store yesterday" could chunk as ["I went to", "the store", "yesterday"] ***
- Return ONLY valid JSON, no markdown formatting`
    }

    return `You are an expert linguist creating chunked language learning monologue content.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}

CONTENT_TYPE: MONOLOGUE

SPEAKER_REQUIREMENTS:
- Single speaker throughout
- Maintain consistent tone and pace
- Professional vocabulary properly segmented

CONTENT_CHUNKING_RULES:
1. Break text into meaningful sense groups (3-8 words per chunk)
2. Each chunk should be a complete thought unit
3. Provide accurate Chinese translation for each chunk
4. Maintain natural English flow

OUTPUT_JSON_STRUCTURE:
{
  "title": "Engaging title",
  "description": "Brief description",
  "content_type": "monologue",
  "original_text": "Full English text",
  "difficulty": "${difficulty}",
  "tags": ["${topic.toLowerCase().split(' ')[0] || 'monologue'}", "${difficulty.toLowerCase()}"],
  "chunks": [
    {
      "speaker": null,
      "speakerName": null,
      "text": "English text chunk",
      "translation": "中文翻译"
    }
  ]
}

SENSE_GROUP_EXAMPLES (Follow this style STRICTLY):

Example 1:
Input: "And we're ready to start on a new era in international cooperation in space."
Correct chunks:
[
  {"text": "And we're ready", "translation": "我们已经准备好"},
  {"text": "to start on a new era", "translation": "去开启一个新纪元"},
  {"text": "in international cooperation", "translation": "在国际合作方面"},
  {"text": "in space.", "translation": "在太空领域。"}
]

Example 2:
Input: "Making it significantly easier for developers to build applications."
Correct chunks:
[
  {"text": "Making it significantly easier", "translation": "使其变得极其容易"},
  {"text": "for developers", "translation": "对开发者来说"},
  {"text": "to build applications.", "translation": "去构建应用程序。"}
]

Example 3 (Multi-sentence):
Input: "I have many hopes for the future. I want to travel to new places."
Correct chunks:
[
  {"text": "I have many hopes", "translation": "我有许多希望"},
  {"text": "for the future.", "translation": "对于未来。"},
  {"text": "I want to travel", "translation": "我想去旅行"},
  {"text": "to new places.", "translation": "去新地方。"}
]

*** IMPORTANT: PUNCTUATION RULES ***
- Sentence-ending punctuation (., !, ?) MUST be attached to the LAST chunk of that sentence
- Commas and other mid-sentence punctuation stay with their word
- When chunks are joined with spaces, they must EXACTLY match the original text

CRITICAL RULES:
- "speaker" MUST be null for monologue
- "speakerName" MUST be null for monologue
- Each chunk must have "text" and "translation"
- Break sentences into natural speech pause units (3-8 words per chunk)
- DO NOT output complete sentences as single chunks - split them into sense groups
- Return ONLY valid JSON, no markdown formatting`
  }

  private processResponse(
    content: any,
    provider: ProviderType,
    contentType: ContentType,
    speakerGender?: SpeakerGender
  ): StudyMaterial {
    const chunks: Chunk[] = content.chunks.map((item: any, index: number) => ({
      id: `openai_${Date.now()}_${index}`,
      text: item.text,
      translation: item.translation,
      speaker: contentType === 'dialogue' ? item.speaker || (index % 2 === 0 ? 'A' : 'B') : null,
      speakerName: contentType === 'dialogue' ? item.speakerName || null : null,
      start_time: index * 3.5,
      end_time: (index + 1) * 3.5,
    }))

    return {
      id: `openai_${Date.now()}`,
      title: content.title,
      description: content.description,
      original_text: content.original_text,
      chunks,
      duration: chunks.length * 3.5,
      config: {
        recommended_speed: 1.0,
        recommended_noise_level: 0.2,
        provider_type: provider,
        tags: content.tags,
        difficulty: content.difficulty,
        content_type: contentType,
        speaker_gender: speakerGender,
      },
      createdAt: Date.now(),
      ttsGenerated: false,
    }
  }
}

export class GeminiService extends AIService {
  async generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType = 'monologue',
    speakerGender: SpeakerGender = 'male-female'
  ): Promise<StudyMaterial> {
    const prompt = this.buildPrompt(topic, difficulty, contentType, speakerGender)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-1.5-flash'}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = JSON.parse(data.candidates[0].content.parts[0].text)
    return this.processResponse(content, 'gemini', contentType, speakerGender)
  }

  async generateAudio(text: string): Promise<ArrayBuffer> {
    throw new Error('Gemini TTS not supported. Use browser TTS or another provider.')
  }

  private buildPrompt(
    topic: string,
    difficulty: string,
    contentType: ContentType,
    speakerGender: SpeakerGender
  ): string {
    const speakerNames = {
      'male-male': { A: 'John', B: 'Mike' },
      'male-female': { A: 'John', B: 'Sarah' },
      'female-female': { A: 'Emma', B: 'Lisa' },
    }
    const names = speakerNames[speakerGender]

    if (contentType === 'dialogue') {
      return `You are an expert linguist creating chunked language learning dialogue content.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}
SPEAKER_GENDER: ${speakerGender}
SPEAKER_NAMES: Speaker A = "${names.A}" (${speakerGender.split('-')[0]}), Speaker B = "${names.B}" (${speakerGender.split('-')[1]})

CONTENT_TYPE: DIALOGUE

SPEAKER_REQUIREMENTS:
- Speaker A is "${names.A}" (${speakerGender.split('-')[0]} voice)
- Speaker B is "${names.B}" (${speakerGender.split('-')[1]} voice)
- Each chunk MUST include "speaker": "A" or "B" AND "speakerName": "${names.A}" or "${names.B}"
- Alternate between speakers naturally in a realistic conversation flow
- Keep dialogue chunks SHORT (2-6 words for natural speech)
- Include fillers like "Well", "Oh", "Yeah", "Hmm" as standalone chunks for realism
- Use natural turn-taking patterns (question → answer, statement → response)

CONTENT_CHUNKING_RULES:
1. Break into natural sense groups (3-8 words per chunk)
2. Each chunk should be a complete thought unit
3. Provide accurate Chinese translation for each chunk
4. Preserve natural conversation rhythm

OUTPUT_JSON_STRUCTURE:
{
  "title": "Engaging dialogue title",
  "description": "Brief description of the conversation scenario",
  "content_type": "dialogue",
  "original_text": "Full conversation transcript",
  "difficulty": "${difficulty}",
  "tags": ["${topic.toLowerCase().split(' ')[0] || 'dialogue'}", "${difficulty.toLowerCase()}"],
  "chunks": [
    {
      "speaker": "A",
      "speakerName": "${names.A}",
      "text": "English dialogue chunk",
      "translation": "中文翻译"
    }
  ]
}

FEW-SHOT EXAMPLES:

Example 1 (Easy - Ordering Food):
{
  "chunks": [
    {"speaker": "A", "speakerName": "John", "text": "Hi there.", "translation": "你好。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Welcome in!", "translation": "欢迎光临！"},
    {"speaker": "A", "speakerName": "John", "text": "One coffee please.", "translation": "请来一杯咖啡。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Sure thing.", "translation": "好的。"},
    {"speaker": "A", "speakerName": "John", "text": "How much?", "translation": "多少钱？"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Three dollars.", "translation": "三美元。"}
  ]
}

Example 2 (Medium - Job Interview):
{
  "chunks": [
    {"speaker": "A", "speakerName": "Mike", "text": "Thanks for coming.", "translation": "谢谢你前来面试。"},
    {"speaker": "B", "speakerName": "Emma", "text": "My pleasure.", "translation": "我的荣幸。"},
    {"speaker": "A", "speakerName": "Mike", "text": "Tell me about yourself.", "translation": "介绍一下你自己。"},
    {"speaker": "B", "speakerName": "Emma", "text": "I have five years experience.", "translation": "我有五年经验。"},
    {"speaker": "A", "speakerName": "Mike", "text": "Why this company?", "translation": "为什么选择我们？"},
    {"speaker": "B", "speakerName": "Emma", "text": "Great products.", "translation": "产品很棒。"}
  ]
}

Example 3 (Hard - Debate):
{
  "chunks": [
    {"speaker": "A", "speakerName": "John", "text": "The data is clear.", "translation": "数据很清楚。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "But costs matter.", "translation": "但成本很重要。"},
    {"speaker": "A", "speakerName": "John", "text": "Long-term costs are higher.", "translation": "长期成本更高。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "That's debatable.", "translation": "这有争议。"},
    {"speaker": "A", "speakerName": "John", "text": "Science doesn't debate.", "translation": "科学无需辩论。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Fair point.", "translation": "说得对。"}
  ]
}

Example 4 (Insane - Academic):
{
  "chunks": [
    {"speaker": "A", "speakerName": "Mike", "text": "The implications concern me.", "translation": "这些影响让我担忧。"},
    {"speaker": "B", "speakerName": "Emma", "text": "Which aspect specifically?", "translation": "具体是哪个方面？"},
    {"speaker": "A", "speakerName": "Mike", "text": "Cryptography vulnerabilities.", "translation": "密码学漏洞。"},
    {"speaker": "B", "speakerName": "Emma", "text": "Indeed a valid concern.", "translation": "确实是个问题。"},
    {"speaker": "A", "speakerName": "Mike", "text": "We need regulations now.", "translation": "需要立即监管。"},
    {"speaker": "B", "speakerName": "Emma", "text": "But innovation suffers.", "translation": "但创新会受阻。"}
  ]
}

CRITICAL RULES:
- For dialogue: "speaker" MUST be "A" or "B", "speakerName" MUST be "${names.A}" or "${names.B}"
- For monologue: "speaker" MUST be null, "speakerName" MUST be null
- Each chunk must have "text" and "translation"
- Keep chunks 3-8 words for optimal learning
- *** CRITICAL: "original_text" is the COMPLETE, UNMODIFIED source text ***
- *** CRITICAL: Each chunk["text"] MUST be extracted EXACTLY from original_text without any changes ***
- *** CRITICAL: When all chunks are joined with spaces, they must EXACTLY match original_text ***
- *** CRITICAL: NO additional words, NO paraphrasing, NO "enhancements" in chunks ***
- *** CRITICAL: Sense groups (chunks) are natural speech pauses, NOT grammatical sentences ***
- *** CRITICAL: Example: "I went to the store yesterday" could chunk as ["I went to", "the store", "yesterday"] ***
- Return ONLY valid JSON, no markdown formatting`
    }

    return `You are an expert linguist creating chunked language learning monologue content.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}

CONTENT_TYPE: MONOLOGUE

SPEAKER_REQUIREMENTS:
- Single speaker throughout
- Maintain consistent tone and pace
- Professional vocabulary properly segmented

CONTENT_CHUNKING_RULES:
1. Break text into meaningful sense groups (3-8 words per chunk)
2. Each chunk should be a complete thought unit
3. Provide accurate Chinese translation for each chunk
4. Maintain natural English flow

OUTPUT_JSON_STRUCTURE:
{
  "title": "Engaging title",
  "description": "Brief description",
  "content_type": "monologue",
  "original_text": "Full English text",
  "difficulty": "${difficulty}",
  "tags": ["${topic.toLowerCase().split(' ')[0] || 'monologue'}", "${difficulty.toLowerCase()}"],
  "chunks": [
    {
      "speaker": null,
      "speakerName": null,
      "text": "English text chunk",
      "translation": "中文翻译"
    }
  ]
}

SENSE_GROUP_EXAMPLES (Follow this style STRICTLY):

Example 1:
Input: "And we're ready to start on a new era in international cooperation in space."
Correct chunks:
[
  {"text": "And we're ready", "translation": "我们已经准备好"},
  {"text": "to start on a new era", "translation": "去开启一个新纪元"},
  {"text": "in international cooperation", "translation": "在国际合作方面"},
  {"text": "in space.", "translation": "在太空领域。"}
]

Example 2:
Input: "Making it significantly easier for developers to build applications."
Correct chunks:
[
  {"text": "Making it significantly easier", "translation": "使其变得极其容易"},
  {"text": "for developers", "translation": "对开发者来说"},
  {"text": "to build applications.", "translation": "去构建应用程序。"}
]

Example 3 (Multi-sentence):
Input: "I have many hopes for the future. I want to travel to new places."
Correct chunks:
[
  {"text": "I have many hopes", "translation": "我有许多希望"},
  {"text": "for the future.", "translation": "对于未来。"},
  {"text": "I want to travel", "translation": "我想去旅行"},
  {"text": "to new places.", "translation": "去新地方。"}
]

*** IMPORTANT: PUNCTUATION RULES ***
- Sentence-ending punctuation (., !, ?) MUST be attached to the LAST chunk of that sentence
- Commas and other mid-sentence punctuation stay with their word
- When chunks are joined with spaces, they must EXACTLY match the original text

CRITICAL RULES:
- "speaker" MUST be null for monologue
- "speakerName" MUST be null for monologue
- Each chunk must have "text" and "translation"
- Break sentences into natural speech pause units (3-8 words per chunk)
- DO NOT output complete sentences as single chunks - split them into sense groups
- Return ONLY valid JSON, no markdown formatting`
  }

  private processResponse(
    content: any,
    provider: ProviderType,
    contentType: ContentType,
    speakerGender?: SpeakerGender
  ): StudyMaterial {
    const chunks: Chunk[] = content.chunks.map((item: any, index: number) => ({
      id: `gemini_${Date.now()}_${index}`,
      text: item.text,
      translation: item.translation,
      speaker: contentType === 'dialogue' ? item.speaker || (index % 2 === 0 ? 'A' : 'B') : null,
      speakerName: contentType === 'dialogue' ? item.speakerName || null : null,
      start_time: index * 3.2,
      end_time: (index + 1) * 3.2,
    }))

    return {
      id: `gemini_${Date.now()}`,
      title: content.title,
      description: content.description,
      original_text: content.original_text,
      chunks,
      duration: chunks.length * 3.2,
      config: {
        recommended_speed: 1.0,
        recommended_noise_level: 0.15,
        provider_type: provider,
        tags: content.tags,
        difficulty: content.difficulty,
        content_type: contentType,
        speaker_gender: speakerGender,
      },
      createdAt: Date.now(),
      ttsGenerated: false,
    }
  }
}

export class DeepSeekService extends AIService {
  async generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType = 'monologue',
    speakerGender: SpeakerGender = 'male-female'
  ): Promise<StudyMaterial> {
    const prompt = this.buildPrompt(topic, difficulty, contentType, speakerGender)

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You are a linguistics expert creating chunked language learning content. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = JSON.parse(data.choices[0].message.content)
    return this.processResponse(content, 'deepseek', contentType, speakerGender)
  }

  async generateAudio(text: string): Promise<ArrayBuffer> {
    throw new Error('DeepSeek TTS not supported. Use browser TTS or another provider.')
  }

  private buildPrompt(
    topic: string,
    difficulty: string,
    contentType: ContentType,
    speakerGender: SpeakerGender
  ): string {
    const speakerNames = {
      'male-male': { A: 'John', B: 'Mike' },
      'male-female': { A: 'John', B: 'Sarah' },
      'female-female': { A: 'Emma', B: 'Lisa' },
    }
    const names = speakerNames[speakerGender]

    if (contentType === 'dialogue') {
      return `You are an expert linguist creating chunked language learning dialogue content.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}
SPEAKER_GENDER: ${speakerGender}
SPEAKER_NAMES: Speaker A = "${names.A}" (${speakerGender.split('-')[0]}), Speaker B = "${names.B}" (${speakerGender.split('-')[1]})

CONTENT_TYPE: DIALOGUE

SPEAKER_REQUIREMENTS:
- Speaker A is "${names.A}" (${speakerGender.split('-')[0]} voice)
- Speaker B is "${names.B}" (${speakerGender.split('-')[1]} voice)
- Each chunk MUST include "speaker": "A" or "B" AND "speakerName": "${names.A}" or "${names.B}"
- Alternate between speakers naturally in a realistic conversation flow
- Keep dialogue chunks SHORT (2-6 words for natural speech)
- Include fillers like "Well", "Oh", "Yeah", "Hmm" as standalone chunks for realism
- Use natural turn-taking patterns (question → answer, statement → response)

CONTENT_CHUNKING_RULES:
1. Break into natural sense groups (3-8 words per chunk)
2. Each chunk should be a complete thought unit
3. Provide accurate Chinese translation for each chunk
4. Preserve natural conversation rhythm

OUTPUT_JSON_STRUCTURE:
{
  "title": "Engaging dialogue title",
  "description": "Brief description of the conversation scenario",
  "content_type": "dialogue",
  "original_text": "Full conversation transcript",
  "difficulty": "${difficulty}",
  "tags": ["${topic.toLowerCase().split(' ')[0] || 'dialogue'}", "${difficulty.toLowerCase()}"],
  "chunks": [
    {
      "speaker": "A",
      "speakerName": "${names.A}",
      "text": "English dialogue chunk",
      "translation": "中文翻译"
    }
  ]
}

FEW-SHOT EXAMPLES:

Example 1 (Easy - Ordering Food):
{
  "chunks": [
    {"speaker": "A", "speakerName": "John", "text": "Hi there.", "translation": "你好。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Welcome in!", "translation": "欢迎光临！"},
    {"speaker": "A", "speakerName": "John", "text": "One coffee please.", "translation": "请来一杯咖啡。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Sure thing.", "translation": "好的。"},
    {"speaker": "A", "speakerName": "John", "text": "How much?", "translation": "多少钱？"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Three dollars.", "translation": "三美元。"}
  ]
}

Example 2 (Medium - Job Interview):
{
  "chunks": [
    {"speaker": "A", "speakerName": "Mike", "text": "Thanks for coming.", "translation": "谢谢你前来面试。"},
    {"speaker": "B", "speakerName": "Emma", "text": "My pleasure.", "translation": "我的荣幸。"},
    {"speaker": "A", "speakerName": "Mike", "text": "Tell me about yourself.", "translation": "介绍一下你自己。"},
    {"speaker": "B", "speakerName": "Emma", "text": "I have five years experience.", "translation": "我有五年经验。"},
    {"speaker": "A", "speakerName": "Mike", "text": "Why this company?", "translation": "为什么选择我们？"},
    {"speaker": "B", "speakerName": "Emma", "text": "Great products.", "translation": "产品很棒。"}
  ]
}

Example 3 (Hard - Debate):
{
  "chunks": [
    {"speaker": "A", "speakerName": "John", "text": "The data is clear.", "translation": "数据很清楚。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "But costs matter.", "translation": "但成本很重要。"},
    {"speaker": "A", "speakerName": "John", "text": "Long-term costs are higher.", "translation": "长期成本更高。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "That's debatable.", "translation": "这有争议。"},
    {"speaker": "A", "speakerName": "John", "text": "Science doesn't debate.", "translation": "科学无需辩论。"},
    {"speaker": "B", "speakerName": "Sarah", "text": "Fair point.", "translation": "说得对。"}
  ]
}

Example 4 (Insane - Academic):
{
  "chunks": [
    {"speaker": "A", "speakerName": "Mike", "text": "The implications concern me.", "translation": "这些影响让我担忧。"},
    {"speaker": "B", "speakerName": "Emma", "text": "Which aspect specifically?", "translation": "具体是哪个方面？"},
    {"speaker": "A", "speakerName": "Mike", "text": "Cryptography vulnerabilities.", "translation": "密码学漏洞。"},
    {"speaker": "B", "speakerName": "Emma", "text": "Indeed a valid concern.", "translation": "确实是个问题。"},
    {"speaker": "A", "speakerName": "Mike", "text": "We need regulations now.", "translation": "需要立即监管。"},
    {"speaker": "B", "speakerName": "Emma", "text": "But innovation suffers.", "translation": "但创新会受阻。"}
  ]
}

CRITICAL RULES:
- For dialogue: "speaker" MUST be "A" or "B", "speakerName" MUST be "${names.A}" or "${names.B}"
- For monologue: "speaker" MUST be null, "speakerName" MUST be null
- Each chunk must have "text" and "translation"
- Keep chunks 3-8 words for optimal learning
- *** CRITICAL: "original_text" is the COMPLETE, UNMODIFIED source text ***
- *** CRITICAL: Each chunk["text"] MUST be extracted EXACTLY from original_text without any changes ***
- *** CRITICAL: When all chunks are joined with spaces, they must EXACTLY match original_text ***
- *** CRITICAL: NO additional words, NO paraphrasing, NO "enhancements" in chunks ***
- *** CRITICAL: Sense groups (chunks) are natural speech pauses, NOT grammatical sentences ***
- *** CRITICAL: Example: "I went to the store yesterday" could chunk as ["I went to", "the store", "yesterday"] ***
- Return ONLY valid JSON, no markdown formatting`
    }

    return `You are an expert linguist creating chunked language learning monologue content.

TOPIC: "${topic}"
DIFFICULTY: ${difficulty}

CONTENT_TYPE: MONOLOGUE

SPEAKER_REQUIREMENTS:
- Single speaker throughout
- Maintain consistent tone and pace
- Professional vocabulary properly segmented

CONTENT_CHUNKING_RULES:
1. Break text into meaningful sense groups (3-8 words per chunk)
2. Each chunk should be a complete thought unit
3. Provide accurate Chinese translation for each chunk
4. Maintain natural English flow

OUTPUT_JSON_STRUCTURE:
{
  "title": "Engaging title",
  "description": "Brief description",
  "content_type": "monologue",
  "original_text": "Full English text",
  "difficulty": "${difficulty}",
  "tags": ["${topic.toLowerCase().split(' ')[0] || 'monologue'}", "${difficulty.toLowerCase()}"],
  "chunks": [
    {
      "speaker": null,
      "speakerName": null,
      "text": "English text chunk",
      "translation": "中文翻译"
    }
  ]
}

SENSE_GROUP_EXAMPLES (Follow this style STRICTLY):

Example 1:
Input: "And we're ready to start on a new era in international cooperation in space."
Correct chunks:
[
  {"text": "And we're ready", "translation": "我们已经准备好"},
  {"text": "to start on a new era", "translation": "去开启一个新纪元"},
  {"text": "in international cooperation", "translation": "在国际合作方面"},
  {"text": "in space.", "translation": "在太空领域。"}
]

Example 2:
Input: "Making it significantly easier for developers to build applications."
Correct chunks:
[
  {"text": "Making it significantly easier", "translation": "使其变得极其容易"},
  {"text": "for developers", "translation": "对开发者来说"},
  {"text": "to build applications.", "translation": "去构建应用程序。"}
]

Example 3 (Multi-sentence):
Input: "I have many hopes for the future. I want to travel to new places."
Correct chunks:
[
  {"text": "I have many hopes", "translation": "我有许多希望"},
  {"text": "for the future.", "translation": "对于未来。"},
  {"text": "I want to travel", "translation": "我想去旅行"},
  {"text": "to new places.", "translation": "去新地方。"}
]

*** IMPORTANT: PUNCTUATION RULES ***
- Sentence-ending punctuation (., !, ?) MUST be attached to the LAST chunk of that sentence
- Commas and other mid-sentence punctuation stay with their word
- When chunks are joined with spaces, they must EXACTLY match the original text

CRITICAL RULES:
- "speaker" MUST be null for monologue
- "speakerName" MUST be null for monologue
- Each chunk must have "text" and "translation"
- Break sentences into natural speech pause units (3-8 words per chunk)
- DO NOT output complete sentences as single chunks - split them into sense groups
- Return ONLY valid JSON, no markdown formatting`
  }

  private processResponse(
    content: any,
    provider: ProviderType,
    contentType: ContentType,
    speakerGender?: SpeakerGender
  ): StudyMaterial {
    const chunks: Chunk[] = content.chunks.map((item: any, index: number) => ({
      id: `deepseek_${Date.now()}_${index}`,
      text: item.text,
      translation: item.translation,
      speaker: contentType === 'dialogue' ? item.speaker || (index % 2 === 0 ? 'A' : 'B') : null,
      speakerName: contentType === 'dialogue' ? item.speakerName || null : null,
      start_time: index * 3.3,
      end_time: (index + 1) * 3.3,
    }))

    return {
      id: `deepseek_${Date.now()}`,
      title: content.title,
      description: content.description,
      original_text: content.original_text,
      chunks,
      duration: chunks.length * 3.3,
      config: {
        recommended_speed: 0.95,
        recommended_noise_level: 0.25,
        provider_type: provider,
        tags: content.tags,
        difficulty: content.difficulty,
        content_type: contentType,
        speaker_gender: speakerGender,
      },
      createdAt: Date.now(),
      ttsGenerated: false,
    }
  }
}

export class LocalService extends AIService {
  async generateChunks(
    topic: string,
    difficulty: string,
    contentType: ContentType = 'monologue'
  ): Promise<StudyMaterial> {
    throw new Error('Local AI generation not implemented yet. Use remote providers.')
  }

  async generateAudio(text: string): Promise<ArrayBuffer> {
    // For local TTS, we could integrate with local TTS engines
    // For now, use browser Web Speech API
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onend = () => {
        // Return empty buffer for now - in production would capture actual audio
        resolve(new ArrayBuffer(0))
      }

      utterance.onerror = reject
      speechSynthesis.speak(utterance)
    })
  }
}

export class AIServiceFactory {
  static createService(provider: ProviderType, config: AIServiceConfig): AIService | any {
    switch (provider) {
      case 'openai':
        return new OpenAIService(config)
      case 'gemini':
        return new GeminiService(config)
      case 'deepseek':
        return new DeepSeekService(config)
      case 'local':
        return new LocalService(config)
      case 'cosyvoice': {
        const { CosyVoiceService } = require('./cosyvoiceService')
        return new CosyVoiceService({
          ...config,
          baseUrl: config.baseUrl || 'http://localhost:8000',
        })
      }
      case 'edge': {
        const { EdgeTTSService } = require('./edgeTTSService')
        return new EdgeTTSService(config)
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }
}
