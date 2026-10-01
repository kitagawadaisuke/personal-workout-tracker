const assert = require('node:assert/strict');
const { countExerciseDays, sortExerciseTypes, moveExerciseType } = require('/tmp/slowrep-picker-tests/utils/exercisePicker.js');

const workouts = [
  { exercises: [{ type: 'squat' }, { type: 'squat' }, { type: 'pushup' }] },
  { exercises: [{ type: 'squat' }] },
  { exercises: [{ type: 'custom-yoga' }] },
];
const counts = countExerciseDays(workouts);
assert.equal(counts.get('squat'), 2);
assert.equal(counts.get('pushup'), 1);
assert.equal(counts.get('custom-yoga'), 1);

const types = ['pushup', 'squat', 'pullup', 'custom-yoga'];
assert.deepEqual(sortExerciseTypes(types, counts, [], 'frequency'), ['squat', 'pushup', 'custom-yoga', 'pullup']);
assert.deepEqual(sortExerciseTypes(types, counts, ['custom-yoga', 'pullup', 'pushup', 'squat'], 'custom'), ['custom-yoga', 'pullup', 'pushup', 'squat']);
assert.deepEqual(sortExerciseTypes([...types, 'new'], counts, ['custom-yoga', 'pushup'], 'custom'), ['custom-yoga', 'pushup', 'squat', 'pullup', 'new']);
assert.deepEqual(moveExerciseType(types, 'pullup', -1), ['pushup', 'pullup', 'squat', 'custom-yoga']);
assert.equal(moveExerciseType(types, 'pushup', -1), types);
console.log('PASS: daily frequency, manual order, new exercises, boundaries');
