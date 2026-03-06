/**
 * lib/deliverability/spam-analyzer.ts
 *
 * Pure content-based spam signal detector.
 * No external dependencies — runs in ~1ms.
 *
 * Returns a score 0–10 where 0 = clean, 10 = almost certain spam.
 * Score feeds into the Deliverability Score via inbox-guardian.ts.
 */

export interface SpamAnalysisResult {
  score: number; // 0–10
  issues: SpamIssue[];
}

export interface SpamIssue {
  type: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
  penalty: number;
}

// ---------------------------------------------------------------------------
// Spam trigger phrases (scored by severity)
// ---------------------------------------------------------------------------

const SPAM_PHRASES: { phrase: string; severity: 'low' | 'medium' | 'high'; penalty: number }[] = [
  // High penalty
  { phrase: 'guaranteed money',    severity: 'high', penalty: 2.0 },
  { phrase: 'make money fast',     severity: 'high', penalty: 2.0 },
  { phrase: 'click here now',      severity: 'high', penalty: 1.5 },
  { phrase: 'free money',          severity: 'high', penalty: 2.0 },
  { phrase: 'act now',             severity: 'high', penalty: 1.5 },
  { phrase: 'limited time offer',  severity: 'high', penalty: 1.5 },
  { phrase: 'you have been selected', severity: 'high', penalty: 1.5 },
  { phrase: 'winner',              severity: 'high', penalty: 1.0 },
  { phrase: 'congratulations',     severity: 'medium', penalty: 0.5 },
  // Medium penalty
  { phrase: 'free gift',           severity: 'medium', penalty: 1.0 },
  { phrase: 'no cost',             severity: 'medium', penalty: 0.5 },
  { phrase: 'special promotion',   severity: 'medium', penalty: 0.5 },
  { phrase: 'unsubscribe',         severity: 'low',    penalty: 0.0 }, // good practice, no penalty
  { phrase: 'order now',           severity: 'medium', penalty: 0.5 },
  { phrase: 'buy now',             severity: 'medium', penalty: 0.5 },
  { phrase: 'earn extra cash',     severity: 'high',   penalty: 2.0 },
  { phrase: '100% free',           severity: 'medium', penalty: 1.0 },
  { phrase: 'risk free',           severity: 'medium', penalty: 0.5 },
  { phrase: 'no obligation',       severity: 'low',    penalty: 0.3 },
];

// ---------------------------------------------------------------------------
// Analyzer
// ---------------------------------------------------------------------------

export function analyzeSpam(subject: string, html: string): SpamAnalysisResult {
  const issues: SpamIssue[] = [];
  let score = 0;

  // Strip HTML tags for text-based checks
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fullText = `${subject} ${text}`.toLowerCase();

  // 1. Spam trigger phrases
  for (const { phrase, severity, penalty } of SPAM_PHRASES) {
    if (penalty > 0 && fullText.includes(phrase)) {
      issues.push({ type: 'spam_phrase', detail: `Contains phrase: "${phrase}"`, severity, penalty });
      score += penalty;
    }
  }

  // 2. Excessive punctuation (>3 consecutive ! or ?)
  const exclamationMatches = (subject + text).match(/!{2,}/g) ?? [];
  const questionMatches    = (subject + text).match(/\?{2,}/g) ?? [];
  if (exclamationMatches.length > 0) {
    const penalty = Math.min(exclamationMatches.length * 0.5, 2);
    issues.push({ type: 'excessive_punctuation', detail: 'Multiple consecutive exclamation marks', severity: 'medium', penalty });
    score += penalty;
  }
  if (questionMatches.length > 0) {
    const penalty = Math.min(questionMatches.length * 0.3, 1);
    issues.push({ type: 'excessive_punctuation', detail: 'Multiple consecutive question marks', severity: 'low', penalty });
    score += penalty;
  }

  // 3. Excessive caps in subject (>40% uppercase letters)
  const subjectLetters = subject.replace(/[^a-zA-Z]/g, '');
  if (subjectLetters.length > 5) {
    const capsRatio = (subject.replace(/[^A-Z]/g, '').length) / subjectLetters.length;
    if (capsRatio > 0.4) {
      const penalty = 1.5;
      issues.push({ type: 'excessive_caps', detail: `Subject is ${Math.round(capsRatio * 100)}% uppercase`, severity: 'medium', penalty });
      score += penalty;
    }
  }

  // 4. Link density
  const linkMatches = html.match(/<a\s/gi) ?? [];
  const wordCount   = text.split(/\s+/).length;
  const linkCount   = linkMatches.length;
  if (linkCount > 10) {
    const penalty = Math.min((linkCount - 10) * 0.2, 2);
    issues.push({ type: 'too_many_links', detail: `Contains ${linkCount} links`, severity: 'medium', penalty });
    score += penalty;
  }
  if (wordCount > 0 && linkCount / wordCount > 0.15) {
    const penalty = 1.0;
    issues.push({ type: 'high_link_ratio', detail: `Link-to-word ratio is high (${linkCount} links / ${wordCount} words)`, severity: 'medium', penalty });
    score += penalty;
  }

  // 5. Image-only email (very little text, lots of <img>)
  const imgCount = (html.match(/<img/gi) ?? []).length;
  if (imgCount > 0 && wordCount < 20) {
    const penalty = 2.0;
    issues.push({ type: 'image_only', detail: 'Email appears to be image-only with very little text', severity: 'high', penalty });
    score += penalty;
  }

  // 6. Missing unsubscribe link
  if (!html.toLowerCase().includes('unsubscribe')) {
    const penalty = 1.5;
    issues.push({ type: 'missing_unsubscribe', detail: 'No unsubscribe link found', severity: 'high', penalty });
    score += penalty;
  }

  return {
    score: Math.min(Math.round(score * 10) / 10, 10),
    issues,
  };
}
