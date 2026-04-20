import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/UI/Layout';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

const emptyQuestion = () => ({
  text: '',
  options: ['', '', '', ''],
  type: 'multiple_choice',
  initialCode: '',
  correctIndex: 0,
  difficulty: 'easy',
  topic: '',
  explanation: '',
});

export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isEdit = Boolean(examId);

  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 30,
    passingScore: 60,
    adaptive: true,
    isActive: true,
    questions: [emptyQuestion()],
  });
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/exams/${examId}`).then(r => setForm({ ...r.data, questions: r.data.questions || [emptyQuestion()] }));
    }
  }, [examId, isEdit]);

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const updateQuestion = (idx, field, value) => {
    setForm((f) => {
      const qs = [...f.questions];
      qs[idx] = { ...qs[idx], [field]: value };
      return { ...f, questions: qs };
    });
  };
  const updateOption = (qIdx, oIdx, value) => {
    setForm((f) => {
      const qs = [...f.questions];
      const opts = [...qs[qIdx].options];
      opts[oIdx] = value;
      qs[qIdx] = { ...qs[qIdx], options: opts };
      return { ...f, questions: qs };
    });
  };
  const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  const removeQuestion = (idx) => setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));

  const generateWithAI = async () => {
    setAiGenerating(true);
    addToast('Generating questions via AI...', 'info');
    try {
      const res = await api.post('/exams/generate', { topic: form.title || 'General' });
      setForm(f => ({ ...f, questions: [...f.questions, ...res.data.questions] }));
      addToast('AI questions generated successfully!', 'success');
    } catch (err) {
      addToast('Failed to generate AI questions', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (form.questions.length === 0) { addToast('Add at least one question', 'error'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/exams/${examId}`, form);
        addToast('Exam updated!', 'success');
      } else {
        await api.post('/exams', form);
        addToast('Exam created!', 'success');
      }
      navigate('/admin/exams');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save exam', 'error');
    } finally {
      setSaving(false);
    }
  }, [form, isEdit, examId, navigate, addToast]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/admin/exams')} className="btn-secondary p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{isEdit ? 'Edit Exam' : 'Create New Exam'}</h1>
            <p className="text-slate-400 mt-1">Fill in exam details and add questions</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Exam meta */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-white">Exam Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
              <input value={form.title} onChange={e => updateField('title', e.target.value)} className="input" required placeholder="e.g. JavaScript Fundamentals" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => updateField('description', e.target.value)} className="input resize-none" rows={2} placeholder="Brief description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Duration (minutes)</label>
                <input type="number" value={form.duration} onChange={e => updateField('duration', Number(e.target.value))} className="input" min={5} max={180} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Passing Score (%)</label>
                <input type="number" value={form.passingScore} onChange={e => updateField('passingScore', Number(e.target.value))} className="input" min={1} max={100} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.adaptive} onChange={e => updateField('adaptive', e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                <span className="text-sm text-slate-300">Adaptive Difficulty</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => updateField('isActive', e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                <span className="text-sm text-slate-300">Active (visible to students)</span>
              </label>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Questions ({form.questions.length})</h2>
              <div className="flex gap-4">
                <button type="button" onClick={generateWithAI} disabled={aiGenerating} className="btn-secondary text-sm flex items-center gap-2 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30">
                  {aiGenerating ? 'Generating...' : '✨ Generate via AI'}
                </button>
                <button type="button" onClick={addQuestion} className="btn-secondary text-sm flex items-center gap-2 py-2">
                  <Plus size={14} /> Add Question
                </button>
              </div>
            </div>

            {form.questions.map((q, qi) => (
              <div key={qi} className="card border border-brand-border space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-primary-400">Q{qi + 1}</span>
                  {form.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)} className="text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="label">Question Text</label>
                    <textarea
                      value={q.text}
                      onChange={e => updateQuestion(qi, 'text', e.target.value)}
                      className="input h-16 resize-none"
                      placeholder="Question text..."
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Question Type</label>
                    <select value={q.type || 'multiple_choice'} onChange={e => updateQuestion(qi, 'type', e.target.value)} className="input py-2">
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="code">Code Editor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Difficulty</label>
                    <select value={q.difficulty} onChange={e => updateQuestion(qi, 'difficulty', e.target.value)} className="input text-sm py-2">
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Topic Name</label>
                    <input value={q.topic} onChange={e => updateQuestion(qi, 'topic', e.target.value)} className="input text-sm py-2" placeholder="Topic (optional)" />
                  </div>
                </div>

                {(!q.type || q.type === 'multiple_choice') ? (
                  <div>
                    <label className="label">Options & Correct Answer</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qi}`}
                            checked={q.correctIndex === oi}
                            onChange={() => updateQuestion(qi, 'correctIndex', oi)}
                            className="accent-indigo-500 flex-shrink-0"
                            title="Mark as correct"
                          />
                          <input
                            value={opt}
                            onChange={e => updateOption(qi, oi, e.target.value)}
                            className="input text-sm py-2"
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="label">Initial Code Template</label>
                    <textarea
                      value={q.initialCode || ''}
                      onChange={e => updateQuestion(qi, 'initialCode', e.target.value)}
                      className="input h-32 font-mono text-sm"
                      placeholder="// Starter code..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button type="button" onClick={() => navigate('/admin/exams')} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Save size={16} />
              {saving ? 'Saving...' : isEdit ? 'Update Exam' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
