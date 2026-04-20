const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['multiple_choice', 'code'], default: 'multiple_choice' },
  options: [{ type: String }],
  correctIndex: { type: Number },
  initialCode: { type: String },
  testCases: [{ input: String, expectedOutput: String }],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  topic: { type: String, default: 'General' },
  explanation: { type: String, default: '' },
});

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    duration: { type: Number, required: true }, // in minutes
    passingScore: { type: Number, default: 60 },
    isActive: { type: Boolean, default: true },
    adaptive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    questions: [questionSchema],
    totalMarks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

examSchema.pre('save', function (next) {
  this.totalMarks = this.questions.length;
  next();
});

module.exports = mongoose.model('Exam', examSchema);
