const User = require('./models/User');
const Exam = require('./models/Exam');

async function seed() {
  const count = await User.countDocuments();
  if (count > 0) {
    console.log('Database already seeded.');
    return;
  }

  // Create admin
  const admin = await User.create({ name: 'Admin User', email: 'admin@demo.com', password: 'admin123', role: 'admin' });
  
  // Create student
  const student = await User.create({ name: 'Student User', email: 'student@demo.com', password: 'student123', role: 'student' });
  
  // Create sample exam
  await Exam.create({
    title: 'JavaScript Fundamentals',
    description: 'Test your knowledge of core JavaScript concepts.',
    duration: 20,
    passingScore: 60,
    adaptive: true,
    isActive: true,
    createdBy: admin._id,
    questions: [
      { text: 'What does `typeof null` return in JavaScript?', options: ['null', 'undefined', 'object', 'string'], correctIndex: 2, difficulty: 'easy', topic: 'Types' },
      { text: 'Which method is used to parse a JSON string?', options: ['JSON.stringify()', 'JSON.parse()', 'JSON.decode()', 'parse()'], correctIndex: 1, difficulty: 'easy', topic: 'JSON' },
      { text: 'What is the output of `console.log(0.1 + 0.2 === 0.3)`?', options: ['true', 'false', 'undefined', 'NaN'], correctIndex: 1, difficulty: 'medium', topic: 'Precision' },
      { text: 'What does the `bind()` method do?', options: ['Calls a function immediately', 'Creates a bound copy of function', 'Converts to string', 'Copies array'], correctIndex: 1, difficulty: 'medium', topic: 'Functions' },
      { text: 'What is a closure in JavaScript?', options: ['A loop', 'A function with access to outer scope', 'An error handler', 'A class method'], correctIndex: 1, difficulty: 'hard', topic: 'Closures' },
      { text: 'What is the difference between `==` and `===`?', options: ['No difference', '=== compares value only', '== does type coercion, === does not', '=== is slower'], correctIndex: 2, difficulty: 'easy', topic: 'Operators' },
      { text: 'Which of the following is NOT a valid JavaScript data type?', options: ['Symbol', 'BigInt', 'Float', 'Boolean'], correctIndex: 2, difficulty: 'medium', topic: 'Types' },
      { text: 'What is event delegation?', options: ['Adding events to each element', 'Using parent to handle child events', 'Preventing default events', 'Creating custom events'], correctIndex: 1, difficulty: 'hard', topic: 'DOM' },
    ],
  });

  await Exam.create({
    title: 'React Basics',
    description: 'Fundamental React concepts and hooks.',
    duration: 15,
    passingScore: 70,
    adaptive: true,
    isActive: true,
    createdBy: admin._id,
    questions: [
      { text: 'What hook is used to manage local state in React?', options: ['useEffect', 'useContext', 'useState', 'useRef'], correctIndex: 2, difficulty: 'easy', topic: 'Hooks' },
      { text: 'What does useEffect with an empty dependency array do?', options: ['Runs every render', 'Runs once after mount', 'Never runs', 'Runs on unmount'], correctIndex: 1, difficulty: 'easy', topic: 'Hooks' },
      { text: 'What is the virtual DOM?', options: ['A browser feature', 'An in-memory representation of the DOM', 'A CSS framework', 'A web server'], correctIndex: 1, difficulty: 'medium', topic: 'Core' },
      { text: 'Which hook should you use to avoid re-creating a function on every render?', options: ['useMemo', 'useCallback', 'useRef', 'useReducer'], correctIndex: 1, difficulty: 'medium', topic: 'Performance' },
      { text: 'What is React Context used for?', options: ['Database connection', 'Routing', 'Global state sharing', 'CSS styling'], correctIndex: 2, difficulty: 'hard', topic: 'Context' },
    ],
  });

  console.log('\n✅ Seeding complete!');
  console.log('   Admin:   admin@demo.com    / admin123');
  console.log('   Student: student@demo.com  / student123');
}

module.exports = seed;
