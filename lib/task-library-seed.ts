export interface TaskLibrarySeedCategory {
  name: string;
  sort_order: number;
  items: string[];
}

export const TASK_LIBRARY_SEED: TaskLibrarySeedCategory[] = [
  {
    name: 'Personal Care & Hygiene',
    sort_order: 0,
    items: [
      // Daily Morning Routine
      'Brush teeth', 'Floss teeth', 'Mouthwash', 'Wash face', 'Moisturizer / sunscreen',
      'Deodorant', 'Shower or bath', 'Wash hair', 'Dry off', 'Clean underwear',
      'Get dressed', 'Comb or brush hair', 'Style hair', 'Put on shoes',
      // Daily Evening Routine
      'Remove makeup', 'Night lotion / skincare', 'Change into pajamas',
      'Lay out tomorrow\'s clothes', 'Charge phone', 'Set alarm',
      // Weekly & As-Needed
      'Clip fingernails', 'Clip toenails', 'Shave', 'Deep condition hair',
      'Clean ears', 'Replace hearing aid batteries', 'Clean glasses / contacts case',
      'Trim eyebrows / facial hair', 'Restock menstrual supplies',
    ],
  },
  {
    name: 'Meals & Kitchen',
    sort_order: 1,
    items: [
      // Before & During Meals
      'Wash hands', 'Get out ingredients', 'Follow recipe', 'Use stove / microwave / toaster',
      'Set cooking timer', 'Set the table', 'Pour a drink', 'Serve food',
      'Eat a balanced meal', 'Drink water',
      // After Meals & Cleanup
      'Clear the table', 'Scrape plates', 'Rinse dishes', 'Wash dishes',
      'Dry and put away dishes', 'Load dishwasher', 'Run dishwasher', 'Unload dishwasher',
      'Wipe table', 'Wipe counters', 'Wipe stovetop', 'Clean microwave',
      'Store leftovers', 'Take out trash', 'Replace trash bag', 'Sweep floor', 'Mop floor',
      // Grocery & Food Management
      'Check food supply', 'Write grocery list', 'Go grocery shopping', 'Put away groceries',
      'Check expiration dates', 'Toss expired food', 'Wipe fridge shelves',
      'Defrost freezer items', 'Restock pantry staples',
      // Specific meals
      'Make a sandwich', 'Make lunch', 'Cook dinner', 'Bake brownies',
      'Make beanie weenie', 'Make a teriyaki chicken sandwich', 'Make a turkey bacon sandwich',
      'Microwave directions', 'Air fryer directions', 'Buy lunch',
    ],
  },
  {
    name: 'Home Cleaning & Organization',
    sort_order: 2,
    items: [
      // Daily Tidying
      'Make the bed', 'Pick up floor items', 'Clothes in hamper', 'Put away personal items',
      'Wipe bathroom sink', 'Hang up towels', 'Return dishes to kitchen',
      'Throw away trash / wrappers', 'Straighten living room', 'Fix couch pillows',
      // Weekly Cleaning
      'Vacuum carpets / rugs', 'Sweep floors', 'Mop floors', 'Clean toilet',
      'Scrub tub / shower', 'Clean mirror', 'Wipe bathroom counter', 'Change hand towel',
      'Clean kitchen sink', 'Wipe appliances', 'Empty trash cans', 'Replace trash bags',
      'Dust furniture / shelves', 'Wipe switches / doorknobs', 'Wash throw blankets',
      'Wipe TV / remotes', 'Tidy family room',
      // Monthly & Occasional
      'Change bed sheets', 'Wash pillows / duvet', 'Clean oven', 'Clean fridge inside',
      'Wipe window sills / blinds', 'Clean all mirrors', 'Organize closet / drawers',
      'Donate or discard unused items', 'Vacuum under furniture', 'Clean ceiling fan blades',
      'Replace air filters', 'Clean bathroom grout', 'Wash curtains', 'Test smoke detectors',
      'Pool skim', 'Wipe cabinets', 'Empty dishwasher',
    ],
  },
  {
    name: 'Laundry',
    sort_order: 3,
    items: [
      'Sort laundry (lights / darks / colors)', 'Check clothing labels', 'Empty pockets',
      'Treat stains', 'Load washing machine', 'Add laundry detergent', 'Select wash cycle',
      'Start washer', 'Move clothes to dryer', 'Clean lint trap', 'Load dryer',
      'Select heat setting', 'Start dryer', 'Remove clothes from dryer',
      'Hang delicate items', 'Fold clothes', 'Hang clothes', 'Put away folded clothes',
      'Hang clothes in closet', 'Put away sheets / towels', 'Hand-wash delicates',
    ],
  },
  {
    name: 'Health & Medications',
    sort_order: 4,
    items: [
      // Daily Health
      'Morning medications', 'Evening medications', 'Drink 6–8 glasses of water',
      'Eat three meals', '30 min physical activity', 'Take vitamins / supplements',
      'Use medical equipment', '7–9 hours of sleep',
      // Appointments & Medications
      'Refill prescriptions', 'Pick up medications', 'Fill pill organizer',
      'Schedule appointments', 'Attend appointments', 'Write doctor questions',
      'Bring medication list', 'Follow doctor instructions', 'Update emergency contacts',
      'Keep health journal',
    ],
  },
  {
    name: 'Money & Bills',
    sort_order: 5,
    items: [
      'Check bank balance', 'Review transactions', 'Track spending', 'Transfer to savings',
      'Wait 24 hrs before buying', 'Compare prices', 'Pay rent', 'Pay utilities',
      'Pay phone bill', 'Pay internet bill', 'Pay subscriptions', 'Check auto payments',
      'Review monthly budget', 'Review bank statement', 'Shred financial documents',
    ],
  },
  {
    name: 'Home Safety',
    sort_order: 6,
    items: [
      'Lock front door', 'Lock back door / windows', 'Turn off stove / oven',
      'Unplug small appliances', 'Clear walkways', 'Store medications safely',
      'Test smoke detector', 'Test CO detector', 'Check fire extinguisher',
      'Clear emergency exits', 'Replace detector batteries', 'Check first aid kit',
      'Update emergency contacts', 'Check flashlight / nightlight',
    ],
  },
  {
    name: 'Community & Social',
    sort_order: 7,
    items: [
      'Attend day program / work', 'Community activity', 'Call or text a friend / family',
      'Make social plans', 'Church / faith activity', 'Volunteer / community event',
      'Library / park / rec center', 'Try a new activity',
      // Transportation & Errands
      'Check transit schedule', 'Prep transit card / cash', 'Leave on time',
      'Carry ID and emergency card', 'Complete errands', 'Return home on time',
      'Report any outing concerns',
      // Existing volunteer sub-activities
      'Sektor', 'Horses',
    ],
  },
  {
    name: 'Personal Development & Wellbeing',
    sort_order: 8,
    items: [
      'Deep breathing / calming activity', 'Journal', 'Read or listen to audiobook',
      'Hobby / creative activity', 'Limit screen time', 'Time outdoors',
      'Do something kind', 'Say one positive thing about yourself',
      // Learning & Growth
      'Work on a personal goal', 'Review goal progress', 'Practice a new skill',
      'Watch / listen to something educational', 'Class / workshop / training',
      'Reach out to mentor', 'Reflect on today', 'Plan one thing for tomorrow',
      // Independent Living Skills (Static)
      'Money', 'Emotions', 'Locations', 'Weather', 'Address', 'Phone',
      'Shopping list', 'GPS', 'Goals', 'Time management (alarms)',
      'Date management (calendars)', 'Task management (lists)',
      'Emergency response', 'Going out prep', 'Fire safety', '911 situations',
    ],
  },
  {
    name: 'Home & Yard Maintenance',
    sort_order: 9,
    items: [
      // Indoor — Weekly
      'Replace burnt-out bulbs', 'Wipe switches / outlet covers', 'Check under sinks for leaks',
      'Unclog slow drains', 'Wipe baseboards', 'Tighten door handles / knobs',
      'Tighten loose screws', 'Check window locks', 'Wipe window sills / tracks',
      // Indoor — Monthly
      'Replace HVAC filter', 'Clean fridge coils', 'Clean dryer vent',
      'Check washer hoses', 'Clean garbage disposal', 'Run dishwasher cleaning cycle',
      'Check tub / shower caulk', 'Check windows / doors for damage',
      'Test door / window locks', 'Flush water heater',
      // Indoor — Seasonal
      'Deep clean oven', 'Clean behind fridge', 'Wash all windows',
      'Reverse ceiling fan direction', 'Inspect roof', 'Check weatherstripping',
      'Schedule HVAC tune-up', 'Check chimney / fireplace',
      // Yard — Weekly
      'Mow lawn', 'Edge sidewalks / driveway', 'Pull weeds', 'Water plants / garden',
      'Sweep porch / patio', 'Pick up yard debris', 'Empty outdoor bins',
      'Check outdoor hoses / spigots', 'Rake leaves', 'Shovel snow / salt walkways',
      'Sweep backyard', 'Clean backyard furniture', 'Scoop up poop',
      // Yard — Monthly
      'Trim hedges / shrubs', 'Prune branches', 'Weed garden beds', 'Apply mulch',
      'Fertilize lawn / garden', 'Treat lawn for pests / weeds', 'Clean gutters / downspouts',
      'Wash outdoor furniture', 'Check outdoor lighting', 'Inspect fence',
      'Check deck / patio', 'Clean and store tools', 'Inspect driveway / walkway',
      // Yard — Seasonal
      'Plant seasonal flowers / veggies', 'Seed bare lawn patches',
      'Winterize faucets / hoses', 'Store garden hoses', 'Store outdoor furniture',
      'Sharpen mower blade', 'Service lawn mower', 'Store garden tools',
      'Inspect exterior paint / wood', 'Power wash driveway / siding',
      'Clean outdoor drains', 'Set up / put away decorations',
      // Wash car
      'Wash car',
    ],
  },
  {
    name: 'Recreation & Fun',
    sort_order: 10,
    items: [
      // Outdoor Adventures
      'Beach', 'Lake or river', 'Fishing', 'Hiking', 'Camping', 'Park', 'Picnic',
      'Bird watching', 'Stargazing', 'Explore a new neighborhood',
      // Outdoor Sports
      'Bike riding', 'Running / jogging', 'Tennis', 'Basketball', 'Playing catch',
      'Frisbee', 'Volleyball', 'Soccer', 'Disc golf', 'Skateboarding / rollerblading',
      'Cornhole / bocce ball', 'Kayaking / canoeing', 'Mini golf', 'Horseback riding',
      'Badminton', 'Fly a kite', 'Pickleball', 'Ping pong', 'MMA', 'Swim',
      'Ride eBikes',
      // Entertainment & Outings
      'Arcade', 'Theme park / amusement park', 'Water park', 'Movies', 'Live sports game',
      'Concert / music festival', 'Fair / carnival', 'Bowling', 'Escape room',
      'Comedy show / open mic', 'Zoo / aquarium', 'Planetarium', 'Local festival / event',
      'Drive-in movie', 'Disneyland', 'Batting cages',
      // Arts, Culture & Learning
      'Museum / art gallery', 'Science / history museum', 'Farmers market',
      'Cooking class', 'Art / pottery class', 'Botanical garden', 'Theater / dance show',
      'Book signing / author talk', 'Visit a new library', 'Antique market / flea market',
      // Social & At-Home Fun
      'Game night', 'Board games / card games', 'Puzzle', 'Movie marathon',
      'Cook or bake together', 'Bonfire / cookout', 'Karaoke', 'Video games',
      'Craft / DIY project', 'Try a new restaurant', 'Road trip', 'Day trip',
      'Spa day at home', 'Start a new hobby', 'YouTube', 'Nap', 'Snack', 'Walk',
      'Horse ranch', 'Beach day',
    ],
  },
  {
    name: 'Gym & Fitness',
    sort_order: 11,
    items: [
      // Getting to the Gym
      'Pack gym bag', 'Pre-workout snack', 'Drink water before leaving', 'Arrive at gym',
      'Wipe down equipment', 'Ask staff for help if needed', 'Warm-up stretch',
      'Cool-down stretch', 'Drink water', 'Log workout', 'Shower and change',
      // Cardio & Warm-Up
      'Treadmill walk', 'Treadmill jog', 'Elliptical machine', 'Stationary bike',
      'Rowing machine', 'Stair climber', 'Jumping jacks', 'Jump rope', 'High knees',
      'Arm circles / leg swings', 'Butt kicks', 'Lateral shuffles',
      // Chest
      'Push-ups', 'Chest press machine', 'Dumbbell bench press', 'Barbell bench press',
      'Incline chest press machine', 'Incline dumbbell press', 'Dumbbell chest fly',
      'Cable chest fly', 'Pec deck machine', 'Decline push-ups',
      // Shoulders
      'Shoulder press machine', 'Dumbbell shoulder press', 'Lateral raise machine',
      'Dumbbell lateral raises', 'Cable lateral raises', 'Front raises', 'Face pulls',
      'Rear delt fly machine', 'Dumbbell rear delt fly', 'Arnold press',
      // Biceps
      'Bicep curl machine', 'Dumbbell bicep curls', 'Barbell bicep curls', 'Hammer curls',
      'Cable bicep curls', 'Preacher curl machine', 'Concentration curls',
      'Incline dumbbell curls', 'Resistance band curls',
      // Triceps
      'Tricep pushdown machine', 'Cable tricep pushdowns', 'Tricep dips',
      'Overhead tricep extension', 'Skull crushers', 'Close-grip bench press',
      'Tricep kickbacks', 'Rope pushdowns', 'Machine overhead press',
      // Back
      'Lat pulldown machine', 'Seated cable row', 'Chest-supported row machine',
      'Dumbbell bent-over row', 'Barbell bent-over row', 'T-bar row machine',
      'Single-arm dumbbell row', 'Pull-ups', 'Assisted pull-up machine',
      'Straight-arm pulldown',
      // Core
      'Plank', 'Side plank', 'Crunches', 'Bicycle crunches', 'Leg raises', 'Dead bug',
      'Russian twists', 'Mountain climbers', 'Ab wheel rollout', 'Cable woodchop',
      'Hollow body hold', 'Bird dog', 'Cable crunch machine', 'Ab coaster machine',
      'Captain\'s chair leg raise', 'Hanging knee raises', 'Decline sit-ups',
      'Superman hold', 'Pallof press', 'Torso twist',
      // Lower Body — Quads
      'Leg press machine', 'Leg extension machine', 'Bodyweight squats', 'Goblet squat',
      'Barbell back squat', 'Hack squat machine', 'Smith machine squat', 'Lunges',
      'Walking lunges', 'Step-ups', 'Sumo squat', 'Wall sit',
      // Lower Body — Hamstrings & Glutes
      'Lying leg curl machine', 'Seated leg curl machine', 'Romanian deadlift',
      'Glute bridge', 'Hip thrust', 'Hip thrust machine', 'Glute kickback machine',
      'Cable glute kickback', 'Donkey kicks', 'Good mornings', 'Nordic curl',
      'Single-leg deadlift',
      // Lower Body — Hips & Calves
      'Hip abduction machine', 'Hip adduction machine', 'Cable hip abduction',
      'Lateral band walks', 'Clamshells', 'Standing calf raise machine',
      'Seated calf raise machine', 'Calf press on leg press', 'Donkey calf raise',
      'Single-leg calf raise',
      // Flexibility & Cool-Down
      'Hamstring stretch', 'Quad stretch', 'Hip flexor stretch', 'Pigeon / figure-four stretch',
      'Child\'s pose', 'Cat-cow stretch', 'Chest opener stretch', 'Shoulder stretch',
      'Tricep stretch', 'Neck rolls', 'Spinal twist', 'Calf stretch', 'IT band stretch',
      'Butterfly stretch', 'Massage chair',
      // Home & Outdoor Wellness
      '30-min walk', 'Yoga video', 'Morning stretch routine', 'Meditation / breathing',
      'Swimming', 'Bodyweight circuit', 'Deep breathing before bed', 'Take the stairs',
      'Park far and walk', 'Dance with music', 'Balance exercises',
      'Resistance band workout', 'Walk after meals',
    ],
  },
];
