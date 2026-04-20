const router = require('express').Router();
const Exam = require('../models/Exam');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/exams - list all active exams (students) or all (admin)
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { createdBy: req.user._id } : { isActive: true };
    const exams = await Exam.find(filter).select('-questions.correctIndex').sort('-createdAt');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/exams/:id - get single exam
router.get('/:id', protect, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    // Hide correct answers for students
    if (req.user.role === 'student') {
      const safeExam = exam.toObject();
      safeExam.questions = safeExam.questions.map((q) => {
        const { correctIndex, ...safe } = q;
        return safe;
      });
      return res.json(safeExam);
    }
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/exams - create exam (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/exams/generate - Mock AI generator (Admin only)
router.post('/generate', protect, adminOnly, async (req, res) => {
  try {
    const { topic } = req.body;
    // Simulate AI delay
    await new Promise(r => setTimeout(r, 2500));
    const generatedQuestions = [
      {
        text: `What is the core principle behind ${topic || 'this concept'}?`,
        type: 'multiple_choice',
        options: ['State Mutation', 'Immutability', 'Global Scope', 'Two-way binding'],
        correctIndex: 1,
        difficulty: 'easy',
        topic: topic || 'Core'
      },
      {
        text: `Explain how ${topic || 'this concept'} is typically implemented under the hood.`,
        type: 'multiple_choice',
        options: ['Via a virtual DOM', 'Via direct DOM updates', 'Via WebGL', 'Via PHP'],
        correctIndex: 0,
        difficulty: 'medium',
        topic: topic || 'Architecture'
      },
      {
        text: `Write a clean implementation pattern solving a common problem related to ${topic || 'this concept'}.`,
        type: 'code',
        initialCode: `// Implement an advanced pattern for ${topic || 'this concept'}\nfunction solve() {\n  \n}`,
        difficulty: 'hard',
        topic: topic || 'Advanced'
      }
    ];
    res.json({ questions: generatedQuestions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/exams/:id - update exam (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/exams/:id - delete exam (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    await Exam.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
