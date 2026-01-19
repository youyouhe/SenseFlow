-- Sample data for SenseFlow testing
-- Insert some example materials with sf_ prefix tables

-- Note: This script should be run after creating tables
-- Replace the user_id with actual UUID from your auth.users table

-- Get or create a sample user (you'll need to replace this with actual user UUID)
-- First, let's insert a sample user record (you can skip this if user already exists)
INSERT INTO sf_users (id, username, preferences) 
VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with actual auth.users.id
  'demo_user',
  '{"theme": "dark", "language": "zh", "trainingMode": "sequential"}'
) ON CONFLICT (id) DO NOTHING;

-- Sample English Learning Materials
INSERT INTO sf_materials (id, title, description, original_text, duration, config, difficulty, provider_type, tags, is_public, author_id) VALUES
(
  uuid_generate_v4(),
  'Daily Conversation Basics',
  'Learn essential English phrases for daily conversations',
  'Hello, how are you today? I am doing well, thank you for asking. What time is it now? It is three o''clock in the afternoon. Would you like some coffee? Yes, please with milk and sugar.',
  25,
  '{"recommended_speed": 1.0, "recommended_noise_level": 0.2, "provider_type": "edge", "tags": ["conversation", "daily", "basic"]}',
  'Easy',
  'edge',
  ARRAY['conversation', 'daily', 'basic'],
  true,
  '00000000-0000-0000-0000-000000000001'
),
(
  uuid_generate_v4(),
  'Business Meeting Phrases',
  'Professional English for business meetings',
  'Let me start by reviewing our quarterly performance. Sales have increased by fifteen percent compared to last year. However, we need to focus on customer retention. I propose implementing a new loyalty program.',
  35,
  '{"recommended_speed": 0.9, "recommended_noise_level": 0.3, "provider_type": "openai", "tags": ["business", "professional", "meeting"]}',
  'Medium',
  'openai',
  ARRAY['business', 'professional', 'meeting'],
  true,
  '00000000-0000-0000-0000-000000000001'
),
(
  uuid_generate_v4(),
  'Technical Interview Preparation',
  'Complex technical vocabulary for job interviews',
  'The algorithmic complexity of this solution is O(n log n). We utilize dynamic programming to optimize the recursive calls. The implementation leverages both hash tables and binary search trees for efficient data retrieval.',
  42,
  '{"recommended_speed": 0.8, "recommended_noise_level": 0.4, "provider_type": "gemini", "tags": ["technical", "interview", "algorithms"]}',
  'Hard',
  'gemini',
  ARRAY['technical', 'interview', 'algorithms'],
  true,
  '00000000-0000-0000-0000-000000000001'
);

-- Get the material IDs we just inserted (you might need to run this separately)
-- For now, let's use some placeholder UUIDs that should match the inserted materials

-- Sample chunks for Daily Conversation Basics
INSERT INTO sf_chunks (material_id, chunk_index, text, translation, start_time, end_time) VALUES
-- Replace material_id_1 with the actual UUID of the first material
(
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  0,
  'Hello, how are you today?',
  '你好，你今天怎么样？',
  0.0,
  3.5
),
(
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  1,
  'I am doing well, thank you for asking.',
  '我很好，谢谢你的关心。',
  3.5,
  7.0
),
(
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  2,
  'What time is it now?',
  '现在几点了？',
  7.0,
  9.5
),
(
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  3,
  'It is three o''clock in the afternoon.',
  '现在是下午三点。',
  9.5,
  13.0
),
(
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  4,
  'Would you like some coffee?',
  '你想来点咖啡吗？',
  13.0,
  16.5
),
(
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  5,
  'Yes, please with milk and sugar.',
  '好的，请加牛奶和糖。',
  16.5,
  21.0
);

-- Sample chunks for Business Meeting Phrases
INSERT INTO sf_chunks (material_id, chunk_index, text, translation, start_time, end_time) VALUES
(
  (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1),
  0,
  'Let me start by reviewing our quarterly performance.',
  '让我从回顾我们的季度表现开始。',
  0.0,
  4.5
),
(
  (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1),
  1,
  'Sales have increased by fifteen percent compared to last year.',
  '与去年相比，销售额增长了百分之十五。',
  4.5,
  9.0
),
(
  (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1),
  2,
  'However, we need to focus on customer retention.',
  '然而，我们需要专注于客户留存。',
  9.0,
  13.5
),
(
  (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1),
  3,
  'I propose implementing a new loyalty program.',
  '我建议实施一个新的忠诚度计划。',
  13.5,
  18.0
);

-- Sample chunks for Technical Interview Preparation
INSERT INTO sf_chunks (material_id, chunk_index, text, translation, start_time, end_time) VALUES
(
  (SELECT id FROM sf_materials WHERE title = 'Technical Interview Preparation' LIMIT 1),
  0,
  'The algorithmic complexity of this solution is O(n log n).',
  '这个解决方案的算法复杂度是 O(n log n)。',
  0.0,
  5.0
),
(
  (SELECT id FROM sf_materials WHERE title = 'Technical Interview Preparation' LIMIT 1),
  1,
  'We utilize dynamic programming to optimize the recursive calls.',
  '我们利用动态编程来优化递归调用。',
  5.0,
  10.0
),
(
  (SELECT id FROM sf_materials WHERE title = 'Technical Interview Preparation' LIMIT 1),
  2,
  'The implementation leverages both hash tables and binary search trees.',
  '实现利用了哈希表和二叉搜索树。',
  10.0,
  15.5
),
(
  (SELECT id FROM sf_materials WHERE title = 'Technical Interview Preparation' LIMIT 1),
  3,
  'for efficient data retrieval.',
  '以实现高效的数据检索。',
  15.5,
  18.0
);

-- Sample user progress data
INSERT INTO sf_user_progress (user_id, material_id, chunks_attempted, chunks_completed, accuracy, total_time_spent, best_streak, current_streak, last_accessed) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  ARRAY[(SELECT id FROM sf_chunks WHERE material_id = (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1) AND chunk_index = 0)],
  ARRAY[(SELECT id FROM sf_chunks WHERE material_id = (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1) AND chunk_index = 0)],
  100.00,
  120, -- 2 minutes
  1,
  1,
  NOW()
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1),
  ARRAY[
    (SELECT id FROM sf_chunks WHERE material_id = (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1) AND chunk_index = 0),
    (SELECT id FROM sf_chunks WHERE material_id = (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1) AND chunk_index = 1)
  ],
  ARRAY[(SELECT id FROM sf_chunks WHERE material_id = (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1) AND chunk_index = 0)],
  50.00,
  300, -- 5 minutes
  1,
  0,
  NOW() - INTERVAL '1 hour'
);

-- Sample training sessions
INSERT INTO sf_training_sessions (user_id, material_id, start_time, end_time, training_mode, chunks_practiced, accuracy, wpm, comprehension_score, adaptive_settings) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour 58 minutes',
  'practice',
  ARRAY[(SELECT id FROM sf_chunks WHERE material_id = (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1) AND chunk_index = 0)],
  100.00,
  45.5,
  85.0,
  '{"difficultyMultiplier": 1.0, "noiseLevelMultiplier": 1.0, "speedMultiplier": 1.0}'
);

-- Sample user favorites
INSERT INTO sf_user_favorites (user_id, material_id) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1)
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Technical Interview Preparation' LIMIT 1)
);

-- Sample material ratings
INSERT INTO sf_material_ratings (user_id, material_id, rating, review) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Daily Conversation Basics' LIMIT 1),
  5,
  'Great for beginners! The chunking makes it easy to learn.'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sf_materials WHERE title = 'Business Meeting Phrases' LIMIT 1),
  4,
  'Good content for business English. Some phrases are challenging.'
);

-- Initialize material analytics
INSERT INTO sf_material_analytics (material_id, total_users, avg_completion_rate, avg_rating, total_plays) 
SELECT 
  id,
  0,
  0.0,
  COALESCE((SELECT AVG(rating) FROM sf_material_ratings WHERE material_id = sf_materials.id), 0.0),
  0
FROM sf_materials;

-- Update the command to show successful completion
DO $$
BEGIN
  RAISE NOTICE 'Sample data inserted successfully for SenseFlow!';
  RAISE NOTICE 'Note: Remember to update the user_id (00000000-0000-0000-0000-000000000001) with actual auth.users.id';
END $$;