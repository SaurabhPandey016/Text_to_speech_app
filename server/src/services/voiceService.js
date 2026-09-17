const defaultVoiceCatalog = [
  { id: 'Riya', name: 'Riya', language: 'English', code: 'en-US', style: 'Professional and clean female voice' },
  { id: 'Graham', name: 'Graham', language: 'English', code: 'en-US', style: 'Authoritative British male voice' },
  { id: 'Simon', name: 'Simon', language: 'English', code: 'en-US', style: 'Articulate and corporate male voice' },
  { id: 'Nate', name: 'Nate', language: 'English', code: 'en-US', style: 'Conversational and friendly male voice' },
  { id: 'Anjali', name: 'Anjali', language: 'English', code: 'en-US', style: 'Confident Indian female voice' },
  { id: 'Ishaan', name: 'Ishaan', language: 'English', code: 'en-US', style: 'Natural Indian male voice' },
  { id: 'Nour', name: 'Nour', language: 'English', code: 'en-US', style: 'Friendly Arabic female voice' },
  { id: 'Matthias', name: 'Matthias', language: 'English', code: 'en-US', style: 'Resonant German male voice' },
  { id: 'Renata', name: 'Renata', language: 'English', code: 'en-US', style: 'Calm Brazilian female voice' },
  { id: 'Yulia', name: 'Yulia', language: 'English', code: 'en-US', style: 'Gentle Russian female voice' },
];

const defaultLanguageCode = 'en-US';
let voices = [...defaultVoiceCatalog];

function normalizeLanguageCode(language) {
  if (!language) return defaultLanguageCode;
  const normalized = String(language).trim();
  return normalized || defaultLanguageCode;
}

function normalizeVoiceItem(item) {
  if (!item || typeof item !== 'object') return null;

  const id = item.id || item.voiceId || item.voice_id || item.name || item.label || item.voice_name || item.voiceName;
  const name = item.name || item.label || item.voiceName || item.voice_name || item.voiceId || item.id || 'Voice';
  const languageName = item.language || item.locale || item.languageName || item.nativeLanguage || item.language_name || 'English';
  const code = item.code || item.locale || item.languageCode || item.lang || item.language || item.language_code || defaultLanguageCode;
  const style = item.style || item.description || item.voiceStyle || item.voice_style || 'Natural';

  if (!id) return null;

  return {
    id: String(id),
    name: String(name),
    language: String(languageName),
    code: String(code).replace(/_/g, '-'),
    style: String(style),
  };
}

function parseProviderVoiceList(payload) {
  if (!payload) return [];

  const source = Array.isArray(payload)
    ? payload
    : payload.voices || payload.items || payload.data || payload.result || payload.voiceList || payload.choices || [];

  const list = Array.isArray(source) ? source : (source && typeof source === 'object' ? [source] : []);
  return list.map(normalizeVoiceItem).filter(Boolean);
}

function buildInworldAuthHeaders() {
  const key = (process.env.INWORLD_API_KEY || '').trim();
  if (!key) return [{}];

  const encodedBasic = Buffer.from(`${key}:`).toString('base64');

  return [
    { Authorization: `Bearer ${key}` },
    { Authorization: `Basic ${key}` },
    { Authorization: `Basic ${encodedBasic}` },
    { 'x-api-key': key },
    { 'api-key': key },
  ];
}

async function loadDynamicVoices() {
  const configuredCatalog = process.env.INWORLD_VOICES || process.env.VOICE_CATALOG || process.env.INWORLD_VOICE_LIST;
  if (configuredCatalog) {
    try {
      const parsed = JSON.parse(configuredCatalog);
      const normalized = parseProviderVoiceList(parsed);
      if (normalized.length) {
        voices = normalized;
        return voices;
      }
    } catch (error) {
      console.warn('Failed to parse configured voice catalog:', error.message);
    }
  }

  const inworldUrl = process.env.INWORLD_TTS_URL || 'https://api.inworld.ai/tts/v1/voice';
  const baseCandidates = [
    inworldUrl.replace(/\/voice$/i, ''),
    inworldUrl.replace(/\/tts\/v1\/voice$/i, '/tts/v1'),
    'https://api.inworld.ai/tts/v1',
    'https://api.inworld.ai/tts',
    'https://api.inworld.ai',
  ];

  const endpointUrls = [...new Set(baseCandidates.flatMap((base) => [
    `${base.replace(/\/$/, '')}/voices`,
    `${base.replace(/\/$/, '')}/voice`,
    `${base.replace(/\/$/, '')}/v1/voices`,
    `${base.replace(/\/$/, '')}/v1/voice`,
    `${base.replace(/\/$/, '')}/tts/v1/voices`,
    `${base.replace(/\/$/, '')}/tts/v1/voice`,
  ]))];

  const headersPool = buildInworldAuthHeaders();

  for (const endpoint of endpointUrls) {
    for (const headers of headersPool) {
      try {
        const response = await fetch(endpoint, { method: 'GET', headers });
        if (!response.ok) continue;
        const data = await response.json();
        const normalized = parseProviderVoiceList(data);
        if (normalized.length) {
          voices = normalized;
          console.log(`[Inworld] loaded ${voices.length} supported voices from ${endpoint}`);
          return voices;
        }
      } catch {
        // continue to next candidate
      }
    }
  }

  voices = [...defaultVoiceCatalog];
  return voices;
}

function resolveVoiceForLanguage(language, requestedVoiceId) {
  const normalizedLanguage = normalizeLanguageCode(language);
  const preferredVoice = voices.find((voice) => voice.code === normalizedLanguage && (voice.id === requestedVoiceId || voice.name === requestedVoiceId));
  if (preferredVoice) return preferredVoice;

  const sameLanguageVoice = voices.find((voice) => voice.code === normalizedLanguage);
  if (sameLanguageVoice) return sameLanguageVoice;

  return voices.find((voice) => voice.code === defaultLanguageCode) || voices[0];
}

export { defaultVoiceCatalog, defaultLanguageCode, loadDynamicVoices, normalizeLanguageCode, resolveVoiceForLanguage, parseProviderVoiceList };
