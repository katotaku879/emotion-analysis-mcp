CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID生成
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- 全文検索

-- 感情タイプの列挙型
CREATE TYPE emotion_category AS ENUM ('positive', 'negative', 'neutral');

-- 習慣ステータスの列挙型  
CREATE TYPE habit_status AS ENUM ('completed', 'skipped', 'partial');

-- タスク優先度の列挙型
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入
INSERT INTO categories (name, description) VALUES
('仕事・勉強', '職務や学習に関する活動'),
('家族・友人との時間', '人間関係に関する活動'),
('趣味・娯楽', '娯楽や趣味に関する活動'), 
('休息・リラックス', '休息や癒しに関する活動'),
('運動・健康', '健康や運動に関する活動'),
('創作活動', '創作や表現に関する活動'),
('その他', 'その他の活動');

CREATE TABLE emotion_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    type emotion_category NOT NULL,
    default_intensity INTEGER CHECK (default_intensity BETWEEN 1 AND 10),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入（分析結果ベース）
INSERT INTO emotion_types (name, type, default_intensity) VALUES
('満足', 'positive', 7),
('楽しさ', 'positive', 8),
('不安', 'negative', 6),
('希望', 'positive', 7),
('誇り', 'positive', 8),
('疲労', 'negative', 6),
('喜び', 'positive', 8),
('怒り', 'negative', 5),
('混乱', 'negative', 6),
('安心', 'positive', 7),
('罪悪感', 'negative', 5),
('悲しみ', 'negative', 4),
('恐れ', 'negative', 4),
('平静', 'neutral', 6),
('退屈', 'negative', 5),
('興味', 'positive', 7),
('感謝', 'positive', 8),
('リラックス', 'positive', 7),
('集中', 'positive', 7);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    category_id INTEGER REFERENCES categories(id),
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 頻出活動の初期データ投入
INSERT INTO activities (name, category_id, usage_count) VALUES
('CCNAの勉強', 1, 34),
('仕事', 1, 26), 
('加藤純一の動画を視聴していた', 3, 19),
('睡眠', 4, 16),
('彼女との話し合い', 2, 15);

CREATE TABLE emotion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    activity_id INTEGER REFERENCES activities(id),
    activity_custom TEXT,
    emotion_type_id INTEGER NOT NULL REFERENCES emotion_types(id),
    category_id INTEGER REFERENCES categories(id),
    intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 10),
    thoughts TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約: 活動は正規化IDまたは自由記述のいずれか必須
    CONSTRAINT activity_constraint CHECK (
        (activity_id IS NOT NULL) OR (activity_custom IS NOT NULL)
    )
);

CREATE TABLE habit_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL,
    date DATE NOT NULL,
    status habit_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(habit_id, date)
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID,
    task_description TEXT NOT NULL,
    priority task_priority DEFAULT 'medium',
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    points INTEGER DEFAULT 0
);