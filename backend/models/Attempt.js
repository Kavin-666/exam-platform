const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  selectedIndex: { type: Number },
  codeAnswer: { type: String }, // For code questions
  isCorrect: { type: Boolean },
  timeTaken: { type: Number }, // seconds
  difficulty: String,
});

const cheatingLogSchema = new mongoose.Schema({
  tabSwitches: { type: Number, default: 0 },
  windowResizes: { type: Number, default: 0 },
  idleEvents: { type: Number, default: 0 },
  rightClickAttempts: { type: Number, default: 0 },
  copyAttempts: { type: Number, default: 0 },
  suspicionScore: { type: Number, default: 0 },
  events: [
    {
      type: { type: String },
      timestamp: Date,
    },
  ],
});

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    answers: [answerSchema],
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    timeTaken: { type: Number, default: 0 }, // seconds
    cheatingLog: cheatingLogSchema,
    screenshots: [{ type: String }],
    status: { type: String, enum: ['in-progress', 'completed', 'flagged'], default: 'in-progress' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attempt', attemptSchema);
