-- 🚀 NEON DATABASE SCHEMA FOR ACOMPANHAMENTO DIÁRIO
-- Otimizado para Serverless e Performance

-- Enable UUID extension for better performance
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL,
    permission TEXT NOT NULL DEFAULT 'Colaborador',
    active BOOLEAN NOT NULL DEFAULT true,
    cargo TEXT,
    cpf TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    "order" REAL NOT NULL,
    good_when_yes BOOLEAN NOT NULL,
    require_reason_when TEXT NOT NULL CHECK (require_reason_when IN ('yes', 'no', 'never'))
);

-- Evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    date_ref TEXT NOT NULL,
    evaluator TEXT NOT NULL,
    evaluated TEXT NOT NULL,
    answers JSONB NOT NULL, -- JSONB for better performance
    score REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'synced'))
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_username TEXT NOT NULL,
    assistants JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
    city TEXT NOT NULL,
    cities JSONB NOT NULL,
    team_id VARCHAR REFERENCES teams(id) ON DELETE SET NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'formation' CHECK (status IN ('formation', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🚀 Performance Indexes (optimized for Neon's columnar storage)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_questions_order ON questions("order");

CREATE INDEX IF NOT EXISTS idx_evaluations_date_ref ON evaluations(date_ref);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated ON evaluations(evaluated);
CREATE INDEX IF NOT EXISTS idx_evaluations_status ON evaluations(status);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_driver ON teams(driver_username);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_routes_team_id ON routes(team_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_dates ON routes(start_date, end_date);

-- 📊 Sample Questions (sistema de avaliação padrão)
INSERT INTO questions (id, text, "order", good_when_yes, require_reason_when) VALUES
    (uuid_generate_v4(), 'O colaborador demonstrou pontualidade durante o período avaliado?', 1, true, 'no'),
    (uuid_generate_v4(), 'O colaborador colaborou efetivamente com a equipe?', 2, true, 'no'),
    (uuid_generate_v4(), 'Houve algum problema de comportamento ou disciplina?', 3, false, 'yes'),
    (uuid_generate_v4(), 'O colaborador seguiu corretamente os procedimentos de segurança?', 4, true, 'no'),
    (uuid_generate_v4(), 'O colaborador demonstrou iniciativa e proatividade?', 5, true, 'never'),
    (uuid_generate_v4(), 'O colaborador manteve organização em seu posto de trabalho?', 6, true, 'no'),
    (uuid_generate_v4(), 'O colaborador cumpriu suas responsabilidades adequadamente?', 7, true, 'no'),
    (uuid_generate_v4(), 'Houve faltas não justificadas durante o período?', 8, false, 'yes'),
    (uuid_generate_v4(), 'O colaborador demonstrou respeito com colegas e superiores?', 9, true, 'no'),
    (uuid_generate_v4(), 'O colaborador atingiu os objetivos estabelecidos?', 10, true, 'no')
ON CONFLICT (id) DO NOTHING;

-- 👤 Admin User (senha: admin123)
INSERT INTO users (
    id, 
    username, 
    phone, 
    password, 
    display_name, 
    role, 
    permission, 
    active, 
    cargo,
    created_at
) VALUES (
    uuid_generate_v4(),
    'admin',
    'admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
    'Administrator',
    'admin',
    'ADM',
    true,
    'ADM',
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- 🔧 Database statistics and optimization
ANALYZE users;
ANALYZE questions;
ANALYZE evaluations;
ANALYZE teams;
ANALYZE routes;

-- ✅ Success verification
DO $$
DECLARE
    user_count INTEGER;
    question_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO question_count FROM questions;
    
    RAISE NOTICE '✅ Schema created successfully!';
    RAISE NOTICE '👥 Users created: %', user_count;
    RAISE NOTICE '❓ Questions created: %', question_count;
    RAISE NOTICE '🚀 Database ready for Acompanhamento Diário!';
END $$;
