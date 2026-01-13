import { StudyMaterial } from '../types';

export const MOCK_MATERIALS: StudyMaterial[] = [
  {
    id: '1',
    title: 'Steve Jobs: Stanford Commencement Speech',
    description: 'Classic speech. Good for practicing emotional cadence and pauses.',
    original_text: "You can't connect the dots looking forward; you can only connect them looking backwards.",
    duration: 12.5,
    config: {
      recommended_speed: 1.0,
      recommended_noise_level: 0.1,
      provider_type: 'edge',
      tags: ['Speech', 'Inspirational', 'American Accent'],
      difficulty: 'Medium'
    },
    chunks: [
      { id: 'c1', text: "You can't connect the dots", start_time: 0, end_time: 2.5 },
      { id: 'c2', text: "looking forward;", start_time: 2.5, end_time: 4.0 },
      { id: 'c3', text: "you can only connect them", start_time: 4.5, end_time: 7.0 },
      { id: 'c4', text: "looking backwards.", start_time: 7.0, end_time: 9.0 },
      { id: 'c5', text: "So you have to trust", start_time: 9.5, end_time: 11.0 },
      { id: 'c6', text: "that the dots will somehow connect.", start_time: 11.0, end_time: 12.5 },
    ]
  },
  {
    id: '2',
    title: 'IELTS Listening: Section 4 - Marine Biology',
    description: 'Academic context with complex sentence structures and passive voice.',
    original_text: "The majority of species in the deep ocean have yet to be discovered by science.",
    duration: 10,
    config: {
      recommended_speed: 1.1,
      recommended_noise_level: 0.4,
      provider_type: 'openai',
      tags: ['Academic', 'Science', 'British Accent'],
      difficulty: 'Hard'
    },
    chunks: [
      { id: 'c1', text: "The majority of species", start_time: 0, end_time: 2.0 },
      { id: 'c2', text: "in the deep ocean", start_time: 2.0, end_time: 3.5 },
      { id: 'c3', text: "have yet to be discovered", start_time: 3.5, end_time: 6.0 },
      { id: 'c4', text: "by science.", start_time: 6.0, end_time: 7.5 },
      { id: 'c5', text: "This presents a challenge", start_time: 8.0, end_time: 9.5 },
    ]
  },
  {
    id: '3',
    title: 'Coffee Shop Conversation (High Noise)',
    description: 'Simulating a real-world conversation with heavy background interference.',
    original_text: "Could I get a double shot espresso with a splash of oat milk, please?",
    duration: 6,
    config: {
      recommended_speed: 1.2,
      recommended_noise_level: 0.8, // High noise!
      provider_type: 'local',
      tags: ['Daily Life', 'Fast', 'Slang'],
      difficulty: 'Insane'
    },
    chunks: [
      { id: 'c1', text: "Could I get", start_time: 0, end_time: 0.8 },
      { id: 'c2', text: "a double shot espresso", start_time: 0.8, end_time: 2.5 },
      { id: 'c3', text: "with a splash of oat milk,", start_time: 2.5, end_time: 4.5 },
      { id: 'c4', text: "please?", start_time: 4.5, end_time: 5.2 },
    ]
  }
];