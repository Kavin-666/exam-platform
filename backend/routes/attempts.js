const router = require('express').Router();
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const { protect } = require('../middleware/auth');

// POST /api/attempts/start - start a new attempt
router.post('/start', protect, async (req, res) => {
  try {
    const { examId } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    // Check existing in-progress
    const existing = await Attempt.findOne({ userId: req.user._id, examId, status: 'in-progress' });
    if (existing) return res.json(existing);
    const attempt = await Attempt.create({
      userId: req.user._id,
      examId,
      totalQuestions: exam.questions.length,
      cheatingLog: {},
    });
    res.status(201).json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/attempts/:id/submit - submit completed attempt
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { answers, cheatingLog, timeTaken } = req.body;
    const attempt = await Attempt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    const exam = await Exam.findById(attempt.examId);

    let score = 0;
    const gradedAnswers = req.body.answers.map(ans => {
      const q = exam.questions.id(ans.questionId);
      let isCorrect = false;

      // Grade Multiple Choice
      if (q.type !== 'code') {
         isCorrect = (ans.selectedIndex === q.correctIndex);
      } else {
         // Grade Code Question: In a real system, we would run this.
         // Here we simple-verify if they wrote anything. We can make it advanced later.
         if (ans.codeAnswer && ans.codeAnswer.trim().length > 10) {
            isCorrect = true; // simplified code correctness mock
         }
      }

      if (isCorrect) score += 1;
      return { ...ans, isCorrect };
    });

    const finalScore = (score / exam.questions.length) * 100;
    const suspicionScore = cheatingLog
      ? (cheatingLog.tabSwitches || 0) * 10 +
        (cheatingLog.windowResizes || 0) * 5 +
        (cheatingLog.idleEvents || 0) * 5 +
        (cheatingLog.copyAttempts || 0) * 8
      : 0;

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.correctAnswers = score;
    attempt.percentage = finalScore;
    attempt.passed = finalScore >= exam.passingScore;
    attempt.timeTaken = timeTaken || 0;
    attempt.cheatingLog = { ...cheatingLog, suspicionScore: Math.min(suspicionScore, 100) };
    attempt.status = suspicionScore >= 50 ? 'flagged' : 'completed';
    attempt.completedAt = new Date();
    await attempt.save();

    res.json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const fs = require('fs');
const path = require('path');

// POST /api/attempts/:id/screenshot - save a periodic screenshot
router.post('/:id/screenshot', protect, async (req, res) => {
  try {
    const { image } = req.body; // base64 string
    if (!image) return res.status(400).json({ message: 'No image provided' });

    const attempt = await Attempt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    // Decode base64 and save to disk
    const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
    const filename = `screenshot_${attempt._id}_${Date.now()}.jpg`;
    const filepath = path.join(__dirname, '..', 'uploads', filename);
    
    fs.writeFileSync(filepath, base64Data, 'base64');

    // Save reference in Attempt model
    if (!attempt.screenshots) attempt.screenshots = [];
    attempt.screenshots.push(`/uploads/${filename}`);
    await attempt.save();

    res.json({ success: true, url: `/uploads/${filename}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attempts/leaderboard - Global high scores
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const attempts = await Attempt.find({ status: { $in: ['completed', 'flagged'] } })
      .populate('userId', 'name')
      .populate('examId', 'title topic')
      .sort({ percentage: -1, timeTaken: 1, _id: -1 }) // highest score, lowest time
      .limit(50);
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attempts/my - get current user's attempts
router.get('/my', protect, async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user._id })
      .populate('examId', 'title duration passingScore')
      .sort('-createdAt');
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attempts/:id - get single attempt detail
router.get('/:id', protect, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate('examId');
    if (!attempt) return res.status(404).json({ message: 'Not found' });
    res.json(attempt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attempts/exam/:examId - admin: all attempts for an exam
router.get('/exam/:examId', protect, async (req, res) => {
  try {
    const attempts = await Attempt.find({ examId: req.params.examId })
      .populate('userId', 'name email')
      .sort('-createdAt');
    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
