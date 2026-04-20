const router = require('express').Router();
const Attempt = require('../models/Attempt');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// GET /api/analytics/student - student stats
router.get('/student', protect, async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user._id, status: { $ne: 'in-progress' } })
      .populate('examId', 'title')
      .sort('createdAt');

    const totalAttempts = attempts.length;
    const avgScore = totalAttempts
      ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts)
      : 0;
    const passed = attempts.filter((a) => a.passed).length;
    const topicBreakdown = {};
    attempts.forEach((a) => {
      a.answers.forEach((ans) => {
        if (!topicBreakdown[ans.difficulty || 'general']) topicBreakdown[ans.difficulty || 'general'] = { correct: 0, total: 0 };
        topicBreakdown[ans.difficulty || 'general'].total++;
        if (ans.isCorrect) topicBreakdown[ans.difficulty || 'general'].correct++;
      });
    });

    res.json({
      totalAttempts,
      avgScore,
      passed,
      failed: totalAttempts - passed,
      passRate: totalAttempts ? Math.round((passed / totalAttempts) * 100) : 0,
      scoreHistory: attempts.map((a) => ({
        exam: a.examId?.title || 'Unknown',
        score: a.percentage,
        date: a.completedAt,
      })),
      topicBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/admin - admin overview
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const attempts = await Attempt.find({ status: { $ne: 'in-progress' } })
      .populate('userId', 'name email')
      .populate('examId', 'title');

    const flagged = attempts.filter((a) => a.status === 'flagged');
    const avgScore = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length)
      : 0;

    const leaderboard = [...attempts]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10)
      .map((a) => ({
        name: a.userId?.name,
        score: a.percentage,
        exam: a.examId?.title,
      }));

    const totalUsers = await User.countDocuments({ role: 'student' });

    res.json({
      totalAttempts: attempts.length,
      avgScore,
      totalFlagged: flagged.length,
      totalUsers,
      leaderboard,
      flaggedAttempts: flagged.map((a) => ({
        id: a._id,
        userName: a.userId?.name,
        exam: a.examId?.title,
        suspicionScore: a.cheatingLog?.suspicionScore,
        tabSwitches: a.cheatingLog?.tabSwitches,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/analytics/insights - Mock AI Smart Insights
router.post('/insights', protect, async (req, res) => {
  try {
    const { attemptId } = req.body;
    const attempt = await Attempt.findById(attemptId).populate('examId');
    if (!attempt) return res.status(404).json({ message: 'Not found' });

    await new Promise(r => setTimeout(r, 2000)); // Simulate AI delay

    let insight = `Based on your performance in ${attempt.examId.title}, here is your AI Smart Insight:\n\n`;
    if (attempt.percentage >= 80) {
      insight += "Great job! You showed strong comprehension. ";
    } else {
      insight += "You struggled a bit with the core concepts. We recommend revisiting the foundational topics. ";
    }

    if (attempt.cheatingLog && attempt.cheatingLog.suspicionScore > 0) {
      insight += "I also noticed some erratic focusing behavior. Try focusing completely on the exam window next time to improve concentration.";
    } else if (attempt.timeTaken < attempt.examId.duration * 30) {
      insight += "You finished incredibly fast! Make sure you aren't rushing through the questions too quickly.";
    } else {
      insight += "Your time management was excellent, balancing thought with execution perfectly.";
    }

    res.json({ insight });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
