export interface TaskLibrarySeedCategory {
  name: string;
  sort_order: number;
  items: string[];
}

export const CHORES_LIBRARY_SEED: TaskLibrarySeedCategory[] = [
  {
    name: 'Kitchen — Daily',
    sort_order: 20,
    items: [
      'Wash dishes', 'Load dishwasher', 'Run dishwasher', 'Unload dishwasher',
      'Wipe counters', 'Wipe stovetop', 'Wipe kitchen table', 'Clean sink',
      'Dry and put away dishes', 'Put away leftovers', 'Wipe microwave outside',
      'Sweep kitchen floor', 'Take out kitchen trash', 'Replace trash bag',
      'Wipe appliance fronts', 'Put away dishes from drying rack',
      'Refill dish soap / sponge', 'Wipe cabinet handles',
    ],
  },
  {
    name: 'Kitchen — Weekly',
    sort_order: 21,
    items: [
      'Mop kitchen floor', 'Clean inside microwave', 'Scrub sink',
      'Wipe down all appliances', 'Clean toaster / toaster oven',
      'Wipe refrigerator exterior', 'Clean coffee maker', 'Descale kettle',
      'Wipe range hood / vent', 'Empty and clean dish rack',
      'Check expiration dates', 'Wipe backsplash', 'Clean garbage disposal',
      'Organize pantry shelf', 'Wipe down cabinet doors',
      'Clean blender / food processor', 'Sanitize cutting boards',
    ],
  },
  {
    name: 'Kitchen — Monthly & Seasonal',
    sort_order: 22,
    items: [
      'Clean oven inside', 'Clean refrigerator inside', 'Wipe fridge shelves and drawers',
      'Defrost freezer', 'Clean under refrigerator', 'Clean fridge coils',
      'Deep clean stovetop / burners', 'Clean oven racks',
      'Organize pantry fully', 'Wipe inside all cabinets',
      'Clean range hood filter', 'Descale dishwasher', 'Run empty dishwasher cleaning cycle',
      'Check and replace sponges / dish cloths', 'Wipe light fixtures',
      'Clean behind stove and oven', 'Polish stainless steel appliances',
      'Sharpen kitchen knives', 'Inventory pantry staples',
    ],
  },
  {
    name: 'Bathrooms — Daily',
    sort_order: 23,
    items: [
      'Wipe bathroom sink', 'Wipe bathroom counter', 'Clean mirror',
      'Replace hand towel', 'Hang up bath towels', 'Wipe toilet seat and rim',
      'Straighten bathroom items', 'Sweep bathroom floor', 'Empty small trash can',
      'Refill hand soap', 'Put away toiletries',
    ],
  },
  {
    name: 'Bathrooms — Weekly',
    sort_order: 24,
    items: [
      'Scrub toilet bowl', 'Clean toilet tank and base', 'Scrub shower walls',
      'Clean bathtub', 'Scrub shower floor', 'Clean shower door / curtain',
      'Mop bathroom floor', 'Wipe light switch and outlet covers',
      'Clean faucets and fixtures', 'Wipe towel bars', 'Empty and wipe trash can',
      'Replace bath mat', 'Wipe medicine cabinet inside',
      'Check and restock supplies (toilet paper, soap, etc.)',
      'Clean exhaust fan cover', 'Wash bath rug',
    ],
  },
  {
    name: 'Bathrooms — Monthly',
    sort_order: 25,
    items: [
      'Deep scrub grout', 'Clean shower curtain liner', 'Wash shower curtain',
      'Descale showerhead', 'Clean inside toilet tank', 'Organize under-sink cabinet',
      'Check and replace toilet brush', 'Caulk check (shower / tub)',
      'Wash bath mats', 'Wipe baseboards', 'Clean exhaust fan',
      'Organize medicine cabinet', 'Check and toss expired products',
    ],
  },
  {
    name: 'Living Room — Daily',
    sort_order: 26,
    items: [
      'Straighten cushions and throws', 'Pick up clutter', 'Fold blankets',
      'Return items to their places', 'Wipe coffee table', 'Fluff pillows',
      'Tidy remote controls', 'Put away shoes / bags',
      'Quick sweep or spot vacuum', 'Empty small trash',
    ],
  },
  {
    name: 'Living Room — Weekly',
    sort_order: 27,
    items: [
      'Vacuum carpet / rug', 'Sweep and mop hard floors', 'Dust all surfaces',
      'Dust TV and electronics', 'Wipe TV screen', 'Clean remotes',
      'Vacuum sofa and cushions', 'Dust ceiling fan blades',
      'Wipe light switches', 'Dust bookshelves', 'Wipe baseboards',
      'Clean glass surfaces / windows', 'Wipe door handles',
      'Vacuum under furniture (move cushions)', 'Straighten bookshelves',
    ],
  },
  {
    name: 'Bedrooms — Daily',
    sort_order: 28,
    items: [
      'Make the bed', 'Put dirty clothes in hamper', 'Tidy nightstand',
      'Put away clothes', 'Open blinds / curtains', 'Air out room',
      'Put away shoes', 'Clear floor clutter',
    ],
  },
  {
    name: 'Bedrooms — Weekly',
    sort_order: 29,
    items: [
      'Change bed sheets', 'Vacuum bedroom floor', 'Dust furniture',
      'Wipe nightstand and dresser', 'Dust ceiling fan', 'Clean mirrors',
      'Vacuum mattress', 'Rotate mattress (monthly)', 'Organize dresser drawers',
      'Wipe light switches', 'Empty bedroom trash',
      'Wash pillowcases', 'Spot clean headboard',
    ],
  },
  {
    name: 'Whole House — Weekly',
    sort_order: 30,
    items: [
      'Vacuum all rooms', 'Sweep all hard floors', 'Mop all hard floors',
      'Dust all surfaces', 'Wipe all mirrors', 'Clean all sinks',
      'Empty all trash cans', 'Replace trash bags', 'Wipe all light switches',
      'Wipe all door handles and knobs', 'Tidy entryway / front door area',
      'Wipe stair railing', 'Spot clean walls', 'Clean sliding glass door',
    ],
  },
  {
    name: 'Whole House — Monthly',
    sort_order: 31,
    items: [
      'Wipe all baseboards', 'Clean all ceiling fans', 'Dust ceiling corners / cobwebs',
      'Clean window sills and tracks', 'Wash windows (inside)', 'Clean all light fixtures',
      'Vacuum under all furniture', 'Flip or rotate area rugs',
      'Wipe all doors (front and back)', 'Clean all mirrors (deep)',
      'Organize closets', 'Vacuum all upholstered furniture',
      'Clean all vents and air returns', 'Replace HVAC filter',
      'Wipe all outlet and switch covers', 'Inspect and clean dryer lint trap',
    ],
  },
  {
    name: 'Whole House — Seasonal & Yearly',
    sort_order: 32,
    items: [
      'Wash all windows inside and out', 'Deep clean all carpets',
      'Steam clean upholstery', 'Clean behind / under all appliances',
      'Organize and purge all closets', 'Donate or discard unused items',
      'Clean garage', 'Clean attic or basement',
      'Wash all curtains and drapes', 'Flip mattresses',
      'Replace smoke detector batteries', 'Test smoke and CO detectors',
      'Check and replace fire extinguisher', 'Clean dryer vent duct',
      'Check weatherstripping on doors / windows', 'Touch up paint',
      'Check caulking around tubs, sinks, and windows',
      'Service HVAC system', 'Flush water heater',
      'Check roof and gutters', 'Power wash exterior / driveway',
      'Clean outdoor furniture', 'Organize shed / storage',
    ],
  },
  {
    name: 'Laundry',
    sort_order: 33,
    items: [
      'Collect laundry from all rooms', 'Sort laundry (lights / darks / colors)',
      'Check clothing labels', 'Empty pockets', 'Pre-treat stains',
      'Load washer', 'Add detergent', 'Select wash cycle', 'Start washer',
      'Move to dryer', 'Clean lint trap', 'Load dryer', 'Start dryer',
      'Remove clothes promptly', 'Hang delicate items to dry',
      'Fold laundry', 'Put away folded clothes',
      'Hang clothes in closet', 'Iron or steam clothes',
      'Put away clean bedding / towels', 'Hand wash delicates',
      'Wash bed sheets', 'Wash towels', 'Wash bathroom rugs',
      'Clean washing machine drum', 'Wipe washer door seal',
    ],
  },
  {
    name: 'Outdoor & Garage',
    sort_order: 34,
    items: [
      // Weekly outdoor
      'Mow lawn', 'Edge lawn', 'Water plants / garden', 'Pull weeds',
      'Sweep porch / patio', 'Sweep driveway / walkway', 'Pick up yard debris',
      'Empty outdoor trash cans', 'Rake leaves',
      // Monthly outdoor
      'Trim hedges / shrubs', 'Fertilize lawn', 'Check sprinkler system',
      'Clean outdoor furniture', 'Wash outdoor cushion covers',
      'Clean grill / BBQ', 'Check and fill bird feeders',
      // Seasonal
      'Plant seasonal flowers / vegetables', 'Winterize garden hoses',
      'Store outdoor furniture for winter', 'Set up patio furniture for summer',
      'Inspect deck / patio for damage', 'Power wash patio / siding',
      'Check fence for damage', 'Clean gutters',
      // Garage
      'Sweep garage floor', 'Organize garage shelves', 'Dispose of hazardous waste',
      'Check tires on stored vehicles', 'Sharpen lawn mower blade',
      'Service lawn mower', 'Organize tools', 'Declutter garage',
    ],
  },
  {
    name: 'Home Maintenance',
    sort_order: 35,
    items: [
      // Regular checks
      'Replace lightbulbs', 'Check for leaks under sinks', 'Unclog slow drains',
      'Test all smoke detectors', 'Test CO detector', 'Replace detector batteries',
      'Check fire extinguisher', 'Check first aid kit',
      // Monthly
      'Clean garbage disposal', 'Run washing machine cleaning cycle',
      'Check and tighten loose screws / handles', 'Check door and window locks',
      'Inspect weatherstripping', 'Clean dryer vent',
      // Seasonal
      'Flush water heater', 'Replace HVAC filter', 'Schedule HVAC tune-up',
      'Check attic / crawl space for leaks', 'Inspect roof after storms',
      'Clean refrigerator coils', 'Check washer hoses for cracks',
      'Reverse ceiling fan direction (seasonal)', 'Check exterior caulking',
      'Inspect and clean chimney / fireplace', 'Test garage door safety reverse',
      'Lubricate garage door tracks', 'Check water heater temperature',
    ],
  },
];
