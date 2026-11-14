/* ==================================================================
   GROVE — content file
   ------------------------------------------------------------------
   Everything the app shows (sections, habits, chores, workouts, meals,
   notes, ranks, milestones) is defined here. To add content, add an
   entry to the matching list below. No other file needs to change.

   Things the user can change in the app's Settings page (target times,
   step goal, switching items on or off, chore intervals) are stored in
   the browser and override the defaults in this file.
   ================================================================== */
window.LD = window.LD || {};

LD.config = {
  appName: 'Grove',

  // A "day" runs from 4am to 4am, so ticking things off after midnight
  // still counts for the evening you are finishing.
  dayStartsHour: 4,

  // Default targets. Editable in Settings.
  defaults: {
    wake: '08:00',
    bed: '23:30',
    screensDownMin: 30,
    stepGoal: 6000,
    workoutsPerWeek: 3
  },

  // XP rules
  xp: {
    tick: 10,          // one habit tick
    workoutFull: 30,
    workoutMin: 15,
    stepsMax: 20,      // scaled by steps / goal
    stepsGoalBonus: 10,
    task: 10,
    base: 50,          // overall level curve: XP to reach level L = base*(L-1)*L
    areaBase: 20       // skill level curve
  },

  /* ---------------- Sections (skills) ----------------
     on:false sections are built but hidden until switched on in Settings.
     color: chart colour for this section. Keep the order: it is a
     colour-blind-safe sequence and charts stack in this order.
     plant: fern | pine | berry | mushroom | bluebell | foxglove | reed */
  areas: [
    { id: 'sleep',  name: 'Sleep',    icon: 'moon',  plant: 'fern',     color: '#3987e5', on: true,
      blurb: 'A steady rhythm: wind down, lights out and up again at the same times each day.' },
    { id: 'move',   name: 'Movement', icon: 'pulse', plant: 'pine',     color: '#d95926', on: true,
      blurb: 'More steps through the day, a sunset walk, and three sessions a week.' },
    { id: 'food',   name: 'Food',     icon: 'apple', plant: 'berry',    color: '#199e70', on: true,
      blurb: 'Meals you like, ready before you are hungry, with the rich stuff measured.' },
    { id: 'upkeep', name: 'Upkeep',   icon: 'home',  plant: 'mushroom', color: '#c98500', on: true,
      blurb: 'Hygiene and chores. Chores appear when they are due and never pile up.' },
    { id: 'study',  name: 'Study',    icon: 'book',  plant: 'bluebell', color: '#d55181', on: false,
      blurb: 'Short focused blocks.' },
    { id: 'craft',  name: 'Hobbies',  icon: 'star',  plant: 'foxglove', color: '#008300', on: false,
      blurb: 'Time on the things you do for their own sake.' },
    { id: 'tasks',  name: 'Tasks',    icon: 'list',  plant: 'reed',     color: '#9085e9', on: false, kind: 'tasks',
      blurb: 'Up to three things that matter today.' }
  ],

  // Cards on the Today page, in order.
  groups: [
    { id: 'morning', name: 'Morning',         icon: 'sun',  until: 12 },
    { id: 'day',     name: 'Through the day', icon: 'leaf', until: 18 },
    { id: 'evening', name: 'Evening',         icon: 'moon', until: 28 }
  ],

  /* ---------------- Daily habits ----------------
     text can use {wake}, {bed} and {screens} (bedtime minus screens-down minutes).
     late:true  = usually ticked the next morning; shows in the "Last night" card. */
  habits: [
    { id: 'up',       area: 'sleep',  group: 'morning', text: 'Up by {wake}' },
    { id: 'light',    area: 'sleep',  group: 'morning', text: '10 minutes of daylight outside' },
    { id: 'teeth_am', area: 'upkeep', group: 'morning', text: 'Brush teeth' },

    { id: 'homemade', area: 'food',   group: 'day',     text: 'Home-made meals, no takeaway' },
    { id: 'measured', area: 'food',   group: 'day',     text: 'Measured the cheese, mayo and oil' },
    { id: 'veg',      area: 'food',   group: 'day',     text: 'Veg or fruit with two meals' },
    { id: 'study25',  area: 'study',  group: 'day',     text: 'One focused study block (25 min)' },
    { id: 'hobby',    area: 'craft',  group: 'day',     text: 'Time on a hobby' },

    { id: 'walk',     area: 'move',   group: 'evening', text: 'Sunset walk' },
    { id: 'shower',   area: 'upkeep', group: 'evening', text: 'Shower' },
    { id: 'teeth_pm', area: 'upkeep', group: 'evening', text: 'Brush teeth and floss' },
    { id: 'screens',  area: 'sleep',  group: 'evening', text: 'Screens down by {screens}', late: true },
    { id: 'bed',      area: 'sleep',  group: 'evening', text: 'In bed by {bed}',           late: true }
  ],

  /* ---------------- Chores ----------------
     every: days between completions (clock restarts when ticked).
     weekday: fixed day instead (0 = Monday ... 6 = Sunday); shows only on that day.
     firstDueIn: days after first use before it first appears, so they do not all land on day one.
     area: which skill earns the XP (default upkeep). */
  chores: [
    { id: 'tidy',      text: 'Tidy room: 10-minute reset', every: 4,  firstDueIn: 0, xp: 15, on: true },
    { id: 'laundry',   text: 'Wash clothes',               every: 7,  firstDueIn: 1, xp: 20, on: true },
    { id: 'groceries', text: 'Groceries',                  every: 7,  firstDueIn: 2, xp: 15, on: true, area: 'food' },
    { id: 'mealprep',  text: 'Meal prep: cook a batch',    every: 4,  firstDueIn: 3, xp: 25, on: true, area: 'food' },
    { id: 'sheets',    text: 'Change sheets',              every: 28, firstDueIn: 5, xp: 25, on: true },
    { id: 'bins',      text: 'Bins out',                   weekday: 2,               xp: 10, on: true },
    { id: 'vacuum',    text: 'Vacuum room',                every: 14, firstDueIn: 6, xp: 15, on: false },
    { id: 'bathroom',  text: 'Clean bathroom',             every: 14, firstDueIn: 8, xp: 20, on: false }
  ],

  /* ---------------- Workouts ----------------
     Full sessions alternate through `plans` in order. */
  workouts: {
    minimum: {
      name: '10-minute minimum',
      text: 'Two rounds, no rest between moves: 10 goblet squats, 10 push-ups, 10 rows each side, 15 kettlebell swings.'
    },
    plans: [
      { id: 'A', name: 'Session A: push and legs', minutes: 25, exercises: [
        { name: 'Goblet squat',           kit: 'kettlebell or dumbbell', sets: '3 × 10' },
        { name: 'Floor or bench press',   kit: 'dumbbells',              sets: '3 × 10' },
        { name: 'One-arm row',            kit: 'dumbbell',               sets: '3 × 10 each side' },
        { name: 'Overhead press',         kit: 'barbell or dumbbells',   sets: '3 × 8' },
        { name: 'Plank',                  kit: 'bodyweight',             sets: '3 × 30 seconds' }
      ] },
      { id: 'B', name: 'Session B: pull and hinge', minutes: 25, exercises: [
        { name: 'Romanian deadlift',      kit: 'barbell',                sets: '3 × 10' },
        { name: 'Pull-ups',               kit: 'bar, band-assisted if needed', sets: '3 × as many clean reps as you can' },
        { name: 'Reverse lunge',          kit: 'dumbbells',              sets: '3 × 8 each leg' },
        { name: 'Kettlebell swing',       kit: '10 kg kettlebell',       sets: '3 × 15' },
        { name: 'Skipping',               kit: 'rope',                   sets: '3 × 1 minute' }
      ] }
    ]
  },

  /* ---------------- Meals ----------------
     Starter ideas. kcal figures are rough estimates per serve. */
  meals: [
    { id: 'burrito', name: 'Chicken burrito bowl', kcal: 550, serves: 4, tag: 'Batch cook',
      why: 'Big bowl, lots of flavour from salsa and lime rather than cheese.',
      items: ['500 g chicken breast, diced', '1 cup rice (dry), cooked', '1 tin black beans', '1 tin corn', 'Salsa, lettuce, lime', 'Greek yoghurt in place of sour cream'],
      steps: 'Season and pan-fry the chicken. Portion rice, beans, corn and chicken into four containers. Add salsa, lettuce and yoghurt when you eat.' },
    { id: 'chilli', name: 'One-pot chilli', kcal: 420, serves: 5, tag: 'Batch cook',
      why: 'Freezes well, so there is always something faster than takeaway.',
      items: ['500 g lean beef or turkey mince', '2 tins kidney beans', '2 tins chopped tomatoes', '1 onion, 2 peppers', 'Chilli powder, cumin, paprika'],
      steps: 'Brown the mince with onion, add everything else, simmer 30 minutes. Eat with a measured cup of rice or on a baked potato.' },
    { id: 'friedrice', name: 'Egg fried rice', kcal: 480, serves: 1, tag: '10 minutes',
      why: 'The quick fallback for nights with nothing prepped.',
      items: ['1 cup cooked rice (leftover is best)', '2 eggs', '1 big handful frozen mixed veg', 'Soy sauce', '1 tsp oil, measured'],
      steps: 'Fry the veg in the oil, push aside, scramble the eggs, add rice and soy sauce and stir until hot.' },
    { id: 'wrap', name: 'Chicken wrap with yoghurt sauce', kcal: 430, serves: 1, tag: '10 minutes',
      why: 'Scratches the creamy, saucy itch without the mayo.',
      items: ['1 wrap', '120 g cooked chicken', 'Lettuce, tomato, cucumber', 'Sauce: 2 tbsp Greek yoghurt, 1 tsp hot sauce, squeeze of lemon'],
      steps: 'Mix the sauce, load the wrap, roll it up.' }
  ],

  swaps: [
    { from: 'Mayo, free-poured',          to: 'Greek yoghurt with mustard or lemon, or light mayo by the spoon' },
    { from: 'A handful of grated cheese', to: '30 g weighed of a strong cheese (parmesan, vintage cheddar)' },
    { from: 'Oil poured from the bottle', to: '1 tsp measured, or a spray' },
    { from: 'Creamy sauces',              to: 'Salsa, hot sauce, pickles, lemon juice' },
    { from: 'Takeaway because nothing is ready', to: 'A frozen portion of your own batch cook' }
  ],

  /* ---------------- Field notes ----------------
     Short reminders shown at the bottom of each section page. */
  notes: {
    sleep: [
      { title: 'Wake time is the anchor', body: 'Getting up at the same time every day sets your body clock more than bedtime does. If the night went badly, still get up on time.' },
      { title: 'Light early, dim late', body: 'Daylight in the first hour tells your body the day has started. Screens down before bed tells it the day is over.' },
      { title: 'Shift slowly', body: 'When this feels easy, move both times 30 minutes earlier in Settings.' }
    ],
    move: [
      { title: 'The minimum counts', body: 'Ten minutes logged beats a perfect session skipped. The habit is showing up.' },
      { title: 'Raise the step goal gradually', body: 'Start near your real average. This page suggests a new goal once you are hitting the current one most days.' },
      { title: 'Start light', body: 'Pick weights you could lift for two more reps than the plan asks. Add a little each week.' }
    ],
    food: [
      { title: 'Cook once, eat three times', body: 'The takeaway decision is made when you are hungry and nothing is ready. Meal prep makes that decision in advance.' },
      { title: 'Measure the dense stuff', body: 'Cheese, mayo and oil are where the calories hide. You do not have to cut them, only measure them.' }
    ],
    upkeep: [
      { title: 'Nothing goes overdue', body: 'A chore shows up when its time has come and waits. Tick it and the clock restarts. There is no backlog.' }
    ]
  },

  /* ---------------- Weekly quests ----------------
     Two are chosen each Monday: the one with most room to grow and one that is going well.
     {n} is the target, which adapts: one more than last week, between min and max.
     kind: habit (ref = habit id, counts days ticked) | workouts | stepgoal (days the goal was reached)
           | chore (ref = chore id, counts completions) | chores (all completions) | group (ref = group id, days the whole card was ticked)
     fixed: use this Settings value as the target instead. */
  questXP: 60,
  quests: [
    { id: 'workouts', area: 'move',   kind: 'workouts', text: '{n} workouts', fixed: 'workoutsPerWeek' },
    { id: 'bed',      area: 'sleep',  kind: 'habit', ref: 'bed',      text: 'In bed on time on {n} nights', min: 3, max: 7 },
    { id: 'stepgoal', area: 'move',   kind: 'stepgoal',               text: 'Reach your step goal on {n} days', min: 2, max: 6 },
    { id: 'homemade', area: 'food',   kind: 'habit', ref: 'homemade', text: 'Home-made meals on {n} days', min: 3, max: 7 },
    { id: 'light',    area: 'sleep',  kind: 'habit', ref: 'light',    text: 'Morning daylight on {n} days', min: 3, max: 7 },
    { id: 'mealprep', area: 'food',   kind: 'chore', ref: 'mealprep', text: 'Batch cook {n} times', min: 1, max: 2 },
    { id: 'walk',     area: 'move',   kind: 'habit', ref: 'walk',     text: 'Sunset walk on {n} evenings', min: 3, max: 7 },
    { id: 'chores',   area: 'upkeep', kind: 'chores',                 text: 'Finish {n} chores', min: 3, max: 7 },
    { id: 'up',       area: 'sleep',  kind: 'habit', ref: 'up',       text: 'Up on time on {n} mornings', min: 3, max: 7 },
    { id: 'morning',  area: 'upkeep', kind: 'group', ref: 'morning',  text: 'The whole morning list on {n} days', min: 2, max: 6 }
  ],

  /* ---------------- Ranks (overall level) ---------------- */
  ranks: [
    { level: 1,  name: 'Wanderer' },
    { level: 3,  name: 'Forager' },
    { level: 6,  name: 'Pathfinder' },
    { level: 10, name: 'Ranger' },
    { level: 15, name: 'Warden' },
    { level: 20, name: 'Grovekeeper' },
    { level: 30, name: 'Elder of the Wood' }
  ],

  /* ---------------- Milestones ----------------
     get(stats) returns [current, target]. stats.totals has: daysLogged,
     steps, goalDays, workouts, chores, ticks, bestSteps. stats.level is the overall level. */
  milestones: [
    { id: 'd1',   name: 'First light',         text: 'Log your first day',           get: function (s) { return [s.totals.daysLogged, 1]; } },
    { id: 'd7',   name: 'A week in the woods', text: 'Log 7 days',                   get: function (s) { return [s.totals.daysLogged, 7]; } },
    { id: 'd30',  name: 'One full moon',       text: 'Log 30 days',                  get: function (s) { return [s.totals.daysLogged, 30]; } },
    { id: 'd90',  name: 'A full season',       text: 'Log 90 days',                  get: function (s) { return [s.totals.daysLogged, 90]; } },
    { id: 'g1',   name: 'Trailhead',           text: 'Hit your step goal once',      get: function (s) { return [s.totals.goalDays, 1]; } },
    { id: 'g10',  name: 'Well-worn path',      text: 'Hit your step goal 10 times',  get: function (s) { return [s.totals.goalDays, 10]; } },
    { id: 's100', name: 'Long trail',          text: 'Walk 100,000 steps in total',  get: function (s) { return [s.totals.steps, 100000]; } },
    { id: 's1m',  name: 'Far country',         text: 'Walk 1,000,000 steps in total', get: function (s) { return [s.totals.steps, 1000000]; } },
    { id: 'w1',   name: 'First lift',          text: 'Log a workout',                get: function (s) { return [s.totals.workouts, 1]; } },
    { id: 'w10',  name: 'Iron roots',          text: 'Log 10 workouts',              get: function (s) { return [s.totals.workouts, 10]; } },
    { id: 'w50',  name: 'Heartwood',           text: 'Log 50 workouts',              get: function (s) { return [s.totals.workouts, 50]; } },
    { id: 'c10',  name: 'Tidy den',            text: 'Complete 10 chores',           get: function (s) { return [s.totals.chores, 10]; } },
    { id: 'l5',   name: 'Finding your feet',   text: 'Reach level 5',                get: function (s) { return [s.level, 5]; } },
    { id: 'l10',  name: 'Ranger\'s oath',      text: 'Reach level 10',               get: function (s) { return [s.level, 10]; } }
  ]
};
