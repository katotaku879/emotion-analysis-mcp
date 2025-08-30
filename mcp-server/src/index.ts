// Personal AI Tools
import { analyze_cause, self_profile } from './tools/personal-ai/index.js';

// 新しく追加する4つのツール
import { analyzeEmotionPatternsTool } from './tools/analyze_emotion_patterns.js';
import { analyzeSleepPatternsTool } from './tools/analyze_sleep_patterns.js';
import { analyzeFatiguePatternsTool } from './tools/analyze_fatigue_patterns.js';
import { analyzeCognitivePatternsTool } from './tools/analyze_cognitive_patterns.js';

// toolsリストに追加
const personalAITools = [
  analyze_cause,
  self_profile,
  // 新しく追加
  analyzeEmotionPatternsTool,
  analyzeSleepPatternsTool,
  analyzeFatiguePatternsTool,
  analyzeCognitivePatternsTool
];

// 既存のtoolsに追加
console.log(`✨ Personal AI tools loaded: ${personalAITools.length} tools`);