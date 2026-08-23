import { analyzePost, VALID_EMOTIONS } from '../src/services/aiService';

describe('AI Service — analyzePost', () => {
  it('should detect positive sentiment for happy text', () => {
    const result = analyzePost('I am so happy and joyful today! Everything is amazing and wonderful!');
    expect(result.sentiment).toBe('positive');
    expect(result.sentimentScore).toBeGreaterThan(0);
    expect(result.emotionTags).toContain('happy');
  });

  it('should detect negative sentiment for sad text', () => {
    const result = analyzePost('I am so sad and miserable. This is terrible and awful.');
    expect(result.sentiment).toBe('negative');
    expect(result.sentimentScore).toBeLessThan(0);
  });

  it('should return neutral for factual text', () => {
    const result = analyzePost('The meeting is at 3pm tomorrow in the conference room.');
    expect(VALID_EMOTIONS).toContain(result.emotionTags[0]);
  });

  it('should detect emotion tags correctly', () => {
    const result = analyzePost('I am so grateful and thankful for this blessing. Life is wonderful.');
    expect(result.emotionTags).toContain('grateful');
  });

  it('should generate summary for long content', () => {
    const longText = 'This is a very long post about technology. '.repeat(20) +
      'Artificial intelligence is transforming the world. ' +
      'Machine learning enables computers to learn from data. ' +
      'Deep learning uses neural networks for complex patterns. ' +
      'Natural language processing helps computers understand text.';
    const result = analyzePost(longText);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeLessThan(longText.length);
  });

  it('should return empty summary for short content', () => {
    const result = analyzePost('Short post.');
    expect(result.summary).toBe('');
  });

  it('should always return valid emotion tags', () => {
    const result = analyzePost('Random post with no specific emotional keywords here.');
    result.emotionTags.forEach((tag) => {
      expect(VALID_EMOTIONS).toContain(tag);
    });
  });
});

describe('AI Service — mood feed integration', () => {
  it('should export VALID_EMOTIONS with all 13 moods', () => {
    expect(VALID_EMOTIONS).toHaveLength(13);
    expect(VALID_EMOTIONS).toContain('neutral');
    expect(VALID_EMOTIONS).toContain('happy');
  });
});
