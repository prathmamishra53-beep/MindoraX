import Sentiment from 'sentiment';

const analyzer = new Sentiment();

export type EmotionTag =
  | 'happy' | 'sad' | 'angry' | 'anxious' | 'calm'
  | 'excited' | 'grateful' | 'frustrated' | 'motivated'
  | 'relaxed' | 'funny' | 'inspiring' | 'neutral';

export const VALID_EMOTIONS: EmotionTag[] = [
  'happy', 'sad', 'angry', 'anxious', 'calm',
  'excited', 'grateful', 'frustrated', 'motivated',
  'relaxed', 'funny', 'inspiring', 'neutral',
];

export type Sentiment3 = 'positive' | 'negative' | 'neutral';

export interface AIAnalysis {
  emotionTags: EmotionTag[];
  sentiment: Sentiment3;
  sentimentScore: number;
  summary: string;
}

// Keyword lists per emotion
const EMOTION_KEYWORDS: Record<EmotionTag, string[]> = {
  happy:       ['happy', 'joy', 'joyful', 'great', 'wonderful', 'amazing', 'love', 'fantastic', 'awesome', 'cheerful', 'delighted', 'pleased', 'glad', 'bliss', 'smile'],
  sad:         ['sad', 'cry', 'crying', 'tears', 'depressed', 'miserable', 'unhappy', 'grief', 'sorrow', 'heartbreak', 'mourn', 'lonely', 'alone', 'hopeless', 'hurt'],
  angry:       ['angry', 'furious', 'rage', 'mad', 'annoyed', 'hate', 'disgusting', 'outraged', 'livid', 'infuriated', 'bitter', 'resentful'],
  anxious:     ['anxious', 'worried', 'nervous', 'stress', 'stressed', 'fear', 'scared', 'panic', 'dread', 'worry', 'overwhelmed', 'uneasy', 'tense'],
  calm:        ['calm', 'peaceful', 'serene', 'relaxed', 'tranquil', 'quiet', 'still', 'zen', 'composed', 'centered'],
  excited:     ['excited', 'thrilled', 'pumped', 'stoked', 'eager', 'energetic', 'electric', 'vibrant', 'enthusiastic'],
  grateful:    ['grateful', 'thankful', 'blessed', 'appreciate', 'gratitude', 'fortunate', 'lucky', 'honor'],
  frustrated:  ['frustrated', 'annoying', 'ugh', 'stuck', 'blocked', 'fed up', 'exhausted', 'fail', 'broken', 'failed'],
  motivated:   ['motivated', 'driven', 'determined', 'goal', 'achieve', 'success', 'hustle', 'grind', 'push', 'progress', 'improve'],
  relaxed:     ['relaxed', 'chill', 'easygoing', 'comfortable', 'cozy', 'restful', 'lazy', 'leisurely', 'mellow'],
  funny:       ['funny', 'lol', 'haha', 'hilarious', 'laugh', 'joke', 'humor', 'comedy', 'meme', 'witty', 'silly'],
  inspiring:   ['inspiring', 'motivating', 'inspiration', 'dream', 'vision', 'hope', 'believe', 'aspire', 'lead', 'change', 'courage'],
  neutral:     [],
};

// Mood-to-compatible-emotions mapping for feed algorithm
export const MOOD_COMPATIBLE_EMOTIONS: Record<string, EmotionTag[]> = {
  happy:      ['happy', 'funny', 'excited', 'grateful', 'inspiring'],
  sad:        ['inspiring', 'calm', 'grateful', 'motivating' as any],
  angry:      ['calm', 'funny', 'inspiring', 'relaxed'],
  anxious:    ['calm', 'relaxed', 'grateful', 'inspiring'],
  calm:       ['calm', 'relaxed', 'happy', 'inspiring'],
  excited:    ['happy', 'funny', 'excited', 'inspiring', 'motivated'],
  grateful:   ['grateful', 'happy', 'inspiring', 'calm'],
  frustrated: ['inspiring', 'funny', 'calm', 'motivated'],
  motivated:  ['motivated', 'inspiring', 'happy', 'excited'],
  relaxed:    ['calm', 'happy', 'funny', 'relaxed'],
  funny:      ['funny', 'happy', 'excited', 'relaxed'],
  inspiring:  ['inspiring', 'motivated', 'happy'],
  neutral:    ['happy', 'calm', 'inspiring'],
};

/**
 * Classify emotions from text using keyword matching.
 * Returns top 3 detected emotions (or ['neutral'] if none found).
 */
function classifyEmotions(text: string): EmotionTag[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/);
  const wordSet = new Set(words);

  const scores: Partial<Record<EmotionTag, number>> = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS) as [EmotionTag, string[]][]) {
    if (emotion === 'neutral') continue;
    let score = 0;
    for (const kw of keywords) {
      if (kw.includes(' ')) {
        if (lower.includes(kw)) score += 2;
      } else {
        if (wordSet.has(kw)) score += 1;
      }
    }
    if (score > 0) scores[emotion] = score;
  }

  const sorted = (Object.entries(scores) as [EmotionTag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  return sorted.length > 0 ? sorted : ['neutral'];
}

/**
 * Extractive summarization: score sentences by word frequency,
 * return top sentences up to ~120 words.
 */
function extractiveSummarize(text: string): string {
  if (text.length <= 200) return ''; // don't summarize short posts

  const sentences = text
    .replace(/([.!?])\s+/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length <= 2) return '';

  // Word frequency
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  // Score each sentence
  const scored = sentences.map((sentence) => {
    const sWords = sentence.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const score = sWords.reduce((sum, w) => sum + (freq[w] || 0), 0) / (sWords.length || 1);
    return { sentence, score };
  });

  // Sort by score, pick top sentences, re-order by original position
  const topN = Math.min(3, Math.ceil(sentences.length / 3));
  const topSentences = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.sentence);

  // Restore original order
  const summary = sentences
    .filter((s) => topSentences.includes(s))
    .join(' ');

  // Trim to ~150 words
  const wordList = summary.split(/\s+/);
  return wordList.length > 150
    ? wordList.slice(0, 150).join(' ') + '…'
    : summary;
}

/**
 * Main analysis function — call after post creation/update.
 */
export function analyzePost(content: string): AIAnalysis {
  // Sentiment polarity
  const result = analyzer.analyze(content);
  const score = result.comparative; // normalized -5 to 5
  let sentiment: Sentiment3;
  if (score > 0.2) sentiment = 'positive';
  else if (score < -0.2) sentiment = 'negative';
  else sentiment = 'neutral';

  const emotionTags = classifyEmotions(content);
  const summary = extractiveSummarize(content);

  return { emotionTags, sentiment, sentimentScore: parseFloat(score.toFixed(3)), summary };
}
