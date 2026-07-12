-- Classroom Service Database Schema
-- This schema supports interactive classroom features including whiteboards, polls, quizzes, hand raises, and shared notes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table (references live sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_session_id UUID NOT NULL,
    course_id UUID NOT NULL,
    instructor_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, ended, archived
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_live_session FOREIGN KEY (live_session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_live_session ON sessions(live_session_id);
CREATE INDEX idx_sessions_course ON sessions(course_id);
CREATE INDEX idx_sessions_instructor ON sessions(instructor_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Whiteboards table
CREATE TABLE IF NOT EXISTS whiteboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Whiteboard',
    crdt_state TEXT NOT NULL, -- Yjs document state
    snapshot_url VARCHAR(1024), -- S3 URL for snapshot
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_snapshot_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_whiteboard_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_whiteboard_locked_by FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_whiteboards_session ON whiteboards(session_id);
CREATE INDEX idx_whiteboards_active ON whiteboards(is_active);

-- Whiteboard elements (for individual element tracking)
CREATE TABLE IF NOT EXISTS whiteboard_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whiteboard_id UUID NOT NULL,
    element_type VARCHAR(50) NOT NULL, -- pen, highlighter, shape, arrow, text, sticky_note, laser_pointer
    element_data JSONB NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_element_whiteboard FOREIGN KEY (whiteboard_id) REFERENCES whiteboards(id) ON DELETE CASCADE,
    CONSTRAINT fk_element_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_elements_whiteboard ON whiteboard_elements(whiteboard_id);
CREATE INDEX idx_elements_type ON whiteboard_elements(element_type);

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of option objects: [{id, text, order}]
    allow_multiple BOOLEAN NOT NULL DEFAULT false,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, completed, archived
    created_by UUID NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_poll_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_poll_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_polls_session ON polls(session_id);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_creator ON polls(created_by);

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL,
    user_id UUID NOT NULL,
    option_ids JSONB NOT NULL, -- Array of selected option IDs
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_vote_poll FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(poll_id, user_id)
);

CREATE INDEX idx_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_votes_user ON poll_votes(user_id);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL, -- Array of question objects
    time_limit INTEGER, -- Time limit in minutes (null for unlimited)
    allow_review BOOLEAN NOT NULL DEFAULT true,
    show_results BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, completed, archived
    created_by UUID NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_quiz_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_quiz_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_quizzes_session ON quizzes(session_id);
CREATE INDEX idx_quizzes_status ON quizzes(status);

-- Quiz submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL,
    user_id UUID NOT NULL,
    answers JSONB NOT NULL, -- Array of answer objects
    score DECIMAL(5,2), -- Score as percentage
    time_taken INTEGER, -- Time taken in seconds
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_submission_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(quiz_id, user_id)
);

CREATE INDEX idx_submissions_quiz ON quiz_submissions(quiz_id);
CREATE INDEX idx_submissions_user ON quiz_submissions(user_id);

-- Hand raises table
CREATE TABLE IF NOT EXISTS hand_raises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    queue_position INTEGER,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID,
    rejected_at TIMESTAMP WITH TIME ZONE,
    raised_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_handraise_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_handraise_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_handraise_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_handraise_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_handraises_session ON hand_raises(session_id);
CREATE INDEX idx_handraises_user ON hand_raises(user_id);
CREATE INDEX idx_handraises_status ON hand_raises(status);
CREATE INDEX idx_handraises_queue ON hand_raises(session_id, queue_position) WHERE status = 'pending';

-- Shared notes table
CREATE TABLE IF NOT EXISTS shared_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Session Notes',
    content TEXT NOT NULL, -- Markdown content
    crdt_state TEXT, -- Yjs document state for collaborative editing
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_edited_by UUID,
    last_edited_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_notes_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notes_editor FOREIGN KEY (last_edited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notes_session ON shared_notes(session_id);
CREATE INDEX idx_notes_creator ON shared_notes(created_by);

-- Live code snippets table
CREATE TABLE IF NOT EXISTS code_snippets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    language VARCHAR(50) NOT NULL, -- java, go, python, kotlin, etc.
    code TEXT NOT NULL,
    description TEXT,
    is_editable BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_snippet_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_snippet_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_snippets_session ON code_snippets(session_id);
CREATE INDEX idx_snippets_language ON code_snippets(language);

-- Session timeline table
CREATE TABLE IF NOT EXISTS session_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- started, poll_created, poll_completed, quiz_started, quiz_finished, whiteboard_saved, hand_raise, screen_share, ended, etc.
    event_data JSONB,
    user_id UUID,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_timeline_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_timeline_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_timeline_session ON session_timeline(session_id);
CREATE INDEX idx_timeline_event_type ON session_timeline(event_type);
CREATE INDEX idx_timeline_occurred_at ON session_timeline(occurred_at DESC);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- mute, remove, disable_chat, lock_whiteboard, end_poll, pin_screen
    target_user_id UUID,
    performed_by UUID NOT NULL,
    reason TEXT,
    action_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_moderation_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_moderation_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_moderation_performer FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_moderation_session ON moderation_actions(session_id);
CREATE INDEX idx_moderation_target ON moderation_actions(target_user_id);
CREATE INDEX idx_moderation_action_type ON moderation_actions(action_type);

-- User session state (for tracking user-specific state in a session)
CREATE TABLE IF NOT EXISTS user_session_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_chat_disabled BOOLEAN NOT NULL DEFAULT false,
    is_video_disabled BOOLEAN NOT NULL DEFAULT false,
    can_speak BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_user_state_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(session_id, user_id)
);

CREATE INDEX idx_user_state_session ON user_session_state(session_id);
CREATE INDEX idx_user_state_user ON user_session_state(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whiteboards_updated_at BEFORE UPDATE ON whiteboards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON polls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hand_raises_updated_at BEFORE UPDATE ON hand_raises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_notes_updated_at BEFORE UPDATE ON shared_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_code_snippets_updated_at BEFORE UPDATE ON code_snippets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_session_state_updated_at BEFORE UPDATE ON user_session_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
