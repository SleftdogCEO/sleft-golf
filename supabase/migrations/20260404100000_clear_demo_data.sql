-- Clear all demo/seed feed data for a fresh start
-- Run once to wipe posts, rounds, likes, comments, and reactions

-- Delete in order respecting foreign key constraints
DELETE FROM post_reactions;
DELETE FROM comments;
DELETE FROM likes;
DELETE FROM posts;
DELETE FROM rounds WHERE status = 'completed';
