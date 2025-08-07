// MCP Tool 定義
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

// 感情分析結果の型定義
export interface EmotionAnalysis {
  period: string;
  totalRecords: number;
  emotionDistribution: {
    emotion: string;
    count: number;
    percentage: number;
  }[];
  averageIntensity: number;
  predominantEmotion: string;
}

// 活動分析結果の型定義
export interface ActivityAnalysis {
  activityName: string;
  totalOccurrences: number;
  emotionImpact: {
    averageIntensity: number;
    emotionDistribution: {
      emotion: string;
      count: number;
    }[];
  };
  recommendations: string[];
}

// 幸福度予測結果の型定義
export interface HappinessPrediction {
  plannedActivity: string;
  predictedIntensity: number;
  confidence: number;
  basedOnSimilarActivities: number;
  recommendations: string[];
}

// データベースレコード型定義
export interface EmotionRecord {
  id: string;
  date: string;
  emotion_type_id: number;
  category_id: number;
  activity_id?: number;
  activity_custom?: string;
  intensity: number;
  thoughts?: string;
  created_at: string;
}
