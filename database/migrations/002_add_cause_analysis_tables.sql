-- ==============================================
-- 原因分析機能用のデータベーススキーマ追加
-- ==============================================
-- File: database/migrations/002_add_cause_analysis_tables.sql

-- 分析キャッシュテーブル（パフォーマンス最適化）
CREATE TABLE IF NOT EXISTS analysis_cache (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL, -- SHA256ハッシュでクエリを識別
    query_type VARCHAR(100) NOT NULL, -- 'cause_analysis', 'self_analysis'等
    query_params JSONB NOT NULL,
    result JSONB NOT NULL,
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    data_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_sensitive BOOLEAN DEFAULT false -- セキュリティフラグ
);

-- 原因分析ログテーブル（分析履歴の記録）
CREATE TABLE IF NOT EXISTS cause_analysis_logs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    timeframe_days INTEGER DEFAULT 30,
    analysis_type VARCHAR(50) DEFAULT 'general', -- 'stress', 'emotion', 'behavior'等
    probable_causes JSONB NOT NULL, -- 推定原因の配列
    evidence_count INTEGER DEFAULT 0,
    confidence_level FLOAT CHECK (confidence_level >= 0 AND confidence_level <= 1),
    recommendations TEXT[],
    user_feedback VARCHAR(20), -- 'helpful', 'not_helpful', null
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms INTEGER,
    error_log TEXT -- エラー発生時の記録
);

-- 変化点検出テーブル（パターン変化の記録）
CREATE TABLE IF NOT EXISTS change_detection_logs (
    id SERIAL PRIMARY KEY,
    detection_date DATE NOT NULL,
    topic VARCHAR(200) NOT NULL,
    baseline_frequency FLOAT,
    recent_frequency FLOAT,
    change_ratio FLOAT NOT NULL, -- 変化率
    significance_score FLOAT CHECK (significance_score >= 0 AND significance_score <= 1),
    related_keywords TEXT[],
    timeframe_days INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(detection_date, topic, timeframe_days)
);

-- パフォーマンス最適化のためのインデックス
CREATE INDEX IF NOT EXISTS idx_cache_query_hash ON analysis_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_type_created ON analysis_cache(query_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cause_logs_created ON cause_analysis_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cause_logs_type ON cause_analysis_logs(analysis_type);
CREATE INDEX IF NOT EXISTS idx_change_detection_date ON change_detection_logs(detection_date DESC);
CREATE INDEX IF NOT EXISTS idx_change_topic ON change_detection_logs(topic);

-- セキュリティ用のRow Level Security (RLS)設定
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cause_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_detection_logs ENABLE ROW LEVEL SECURITY;

-- アクセス制御ポリシー（将来のマルチユーザー対応）
CREATE POLICY cache_access_policy ON analysis_cache
    FOR ALL
    USING (NOT is_sensitive OR current_user = 'app_user');

-- 自動削除トリガー（古いキャッシュの削除）
CREATE OR REPLACE FUNCTION delete_expired_cache()
RETURNS trigger AS $$
BEGIN
    DELETE FROM analysis_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_expired_cache
    AFTER INSERT ON analysis_cache
    EXECUTE FUNCTION delete_expired_cache();

-- 統計情報ビュー
CREATE OR REPLACE VIEW cause_analysis_stats AS
SELECT 
    DATE(created_at) as analysis_date,
    COUNT(*) as total_analyses,
    AVG(confidence_level) as avg_confidence,
    AVG(processing_time_ms) as avg_processing_time,
    COUNT(CASE WHEN user_feedback = 'helpful' THEN 1 END) as helpful_count,
    COUNT(CASE WHEN user_feedback = 'not_helpful' THEN 1 END) as not_helpful_count
FROM cause_analysis_logs
GROUP BY DATE(created_at)
ORDER BY analysis_date DESC;

-- 権限設定
GRANT SELECT, INSERT, UPDATE ON analysis_cache TO app_user;
GRANT SELECT, INSERT ON cause_analysis_logs TO app_user;
GRANT SELECT, INSERT ON change_detection_logs TO app_user;
GRANT SELECT ON cause_analysis_stats TO app_user;