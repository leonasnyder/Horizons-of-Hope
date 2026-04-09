export interface SeedActivity {
  name: string;
  description: string | null;
  category: string | null;
  color: string;
  is_default: number;
  defaults: { time: string; duration: number; days: string | null }[];
  sub_activities: string[];
}

export const SEED_ACTIVITIES: SeedActivity[] = [
  // ── Hobbies ──────────────────────────────────────────────────────
  {
    name: 'Art Project',
    description: 'Fine motor, creativity, following instructions',
    category: 'Hobbies',
    color: '#00a3d7',
    is_default: 0,
    defaults: [],
    sub_activities: ['Painting', 'Legos', 'Drawing'],
  },
  {
    name: 'Dance',
    description: null,
    category: 'Hobbies',
    color: '#cce8b5',
    is_default: 1,
    defaults: [{ time: '10:00', duration: 30, days: null }],
    sub_activities: [],
  },

  // ── Independent Living Skills ─────────────────────────────────────
  {
    name: 'Prepare for the Day',
    description: null,
    category: 'Independent Living Skills',
    color: '#ff4013',
    is_default: 1,
    defaults: [{ time: '08:00', duration: 30, days: null }],
    sub_activities: ['Eat Breakfast', 'Brush Teeth', 'Deodorant', 'Shave'],
  },
  {
    name: 'Get Ready',
    description: null,
    category: 'Independent Living Skills',
    color: '#F97316',
    is_default: 0,
    defaults: [],
    sub_activities: ['Brush Teeth', 'Deodorant', 'Floss Teeth', 'Shave'],
  },
  {
    name: 'Independent Living Skills (Static)',
    description: null,
    category: 'Independent Living Skills',
    color: '#96d35f',
    is_default: 1,
    defaults: [{ time: '09:30', duration: 15, days: '1,2,3,4,5' }],
    sub_activities: [
      'Money', 'Emotions', 'Locations', 'Weather', 'Address', 'Phone',
      'Shopping List', 'GPS', 'Goals', 'Time Management (Alarms)',
      'Date Management (Calendars)', 'Task Management (List)',
      'Emergency Response', 'Going Out Prep', 'Fire Safety', '911 Situations',
    ],
  },
  {
    name: 'Independent Living Skills (Non-Static)',
    description: null,
    category: 'Independent Living Skills',
    color: '#96d35f',
    is_default: 0,
    defaults: [{ time: '09:30', duration: 30, days: null }],
    sub_activities: [
      'Grocery Shopping', 'Baking', 'Cooking Lunch', 'Make a Sandwich',
      'Make Dinner', 'Bake Brownies', 'Make Beanie Weenie',
      'Make a Teriyaki Chicken Sandwich', 'Make a Turkey Bacon Sandwich',
    ],
  },
  {
    name: 'Cooking/Baking',
    description: 'Sequencing, math concepts, life skills',
    category: 'Independent Living Skills',
    color: '#ed719e',
    is_default: 0,
    defaults: [],
    sub_activities: [],
  },
  {
    name: 'Lunch',
    description: null,
    category: 'Independent Living Skills',
    color: '#3a88fe',
    is_default: 1,
    defaults: [{ time: '12:00', duration: 30, days: '1,2,3,4,5' }],
    sub_activities: [
      'Make Lunch', 'Microwave Directions', 'Air Fryer Directions',
      'Buy Lunch', 'Clean Up', 'Other',
    ],
  },

  // ── Social/Recreation ─────────────────────────────────────────────
  {
    name: 'Recreation/Fun Friday',
    description: null,
    category: 'Social/Recreation',
    color: '#0056d6',
    is_default: 1,
    defaults: [{ time: '10:00', duration: 300, days: '5' }],
    sub_activities: [
      'Batting Cages', 'Disneyland', 'Ping Pong', 'Tennis', 'Pickleball',
      'Playing Catch', 'Bowling', 'Arcade', 'Swimming', 'Ride eBikes',
      'MMA', 'Beach Day', 'Horse Ranch',
    ],
  },
  {
    name: 'Swim Lessons',
    description: null,
    category: 'Social/Recreation',
    color: '#94e3fe',
    is_default: 1,
    defaults: [{ time: '14:30', duration: 45, days: '4' }],
    sub_activities: [],
  },

  // ── Wellness/Workout ──────────────────────────────────────────────
  {
    name: 'Gym',
    description: null,
    category: 'Wellness/Workout',
    color: '#874efe',
    is_default: 1,
    defaults: [{ time: '10:00', duration: 90, days: '1,2,3,4' }],
    sub_activities: [
      'Treadmill - Cardio', 'Rowing - Cardio', 'Stretching - Recovery',
      'Bicep Curl - Upper Body', 'Tricep Cable Pulldown - Upper Body',
      'Chest Press - Upper Body', 'Chest Flies - Upper Body',
      'Push Ups - Upper Body', 'Jump Rope - Cardio',
      'Leg Lifts - Lower Body', 'Torso Twist - Core',
      'Skull Crusher - Upper Body', 'Leg Press - Lower Body',
      'Leg Curl - Lower Body', 'Massage Chair',
    ],
  },

  // ── Work at Home ──────────────────────────────────────────────────
  {
    name: 'House/Yard Work',
    description: null,
    category: 'Work at Home',
    color: '#4f7a28',
    is_default: 1,
    defaults: [
      { time: '09:00', duration: 30, days: '1,2,3,4,5' },
      { time: '14:00', duration: 75, days: '1,2,3,4' },
    ],
    sub_activities: [
      'Sweep Floors', 'Wipe Counters and Island', 'Fix Beds',
      'Fold Laundry', 'Clean Windows', 'Mop Floors', 'Scoop up Poop',
      'Water Plants', 'Clean Backyard Furniture', 'Sweep Backyard',
      'Mow the Lawn', 'Wash Car', 'Take Out Trash', 'Sort Recycling',
      'Fix Couch Pillows', 'Tidy Family Room', 'Dust', 'Wipe Cabinets',
      'Empty Dishwasher', 'Pool Skim',
    ],
  },

  // ── Work in the Community ─────────────────────────────────────────
  {
    name: 'Volunteer Work',
    description: null,
    category: 'Work in the Community',
    color: '#f5ec00',
    is_default: 1,
    defaults: [{ time: '13:00', duration: 45, days: '1,2,3,4' }],
    sub_activities: ['Sektor', 'Horses'],
  },

  // ── Free Choice ───────────────────────────────────────────────────
  {
    name: 'Free Choice',
    description: null,
    category: 'Free Choice',
    color: '#F97316',
    is_default: 1,
    defaults: [{ time: '12:30', duration: 15, days: '1,2,3,4' }],
    sub_activities: ['YouTube', 'Bowling', 'Nap', 'Bathroom', 'Snack', 'Walk', 'Other'],
  },
];
