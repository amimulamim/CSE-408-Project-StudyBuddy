CREATE TABLE quizzes (
    quiz_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Enums (run once)
CREATE TYPE question_type AS ENUM ('MultipleChoice', 'ShortAnswer', 'TrueFalse');
CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                          -- DB primary key                                                       -- Optional logical ID
    quiz_id UUID NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,   -- FK to quizzes
    question_text TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer TEXT,
    type question_type NOT NULL,
    difficulty difficulty_level NOT NULL,
    marks INTEGER NOT NULL,
    hints TEXT[],
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,

    score NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    feedback TEXT,
    topic TEXT,
    domain TEXT,
    date TIMESTAMPTZ DEFAULT now()
);


