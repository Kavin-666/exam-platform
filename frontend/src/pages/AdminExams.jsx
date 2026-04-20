import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/UI/Layout';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Plus, Trash2, Edit3, BookOpen, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/exams').then(r => setExams(r.data)).finally(() => setLoading(false));
  }, []);

  const deleteExam = async (id) => {
    if (!confirm('Delete this exam?')) return;
    try {
      await api.delete(`/exams/${id}`);
      setExams((prev) => prev.filter((e) => e._id !== id));
      addToast('Exam deleted', 'success');
    } catch {
      addToast('Failed to delete exam', 'error');
    }
  };

  const toggleActive = async (exam) => {
    try {
      const res = await api.put(`/exams/${exam._id}`, { isActive: !exam.isActive });
      setExams((prev) => prev.map((e) => (e._id === exam._id ? res.data : e)));
      addToast(`Exam ${res.data.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      addToast('Failed to update exam', 'error');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Exams</h1>
          <p className="text-slate-400 mt-1">Create, edit, and manage your exams</p>
        </div>
        <Link to="/admin/exams/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Exam
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">No exams yet. Create your first one!</p>
          <Link to="/admin/exams/new" className="btn-primary">Create Exam</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((e) => (
            <div key={e._id} className="card flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white text-lg">{e.title}</h3>
                  <span className={`badge ${e.isActive ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {e.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {e.adaptive && <span className="badge bg-purple-900 text-purple-300">Adaptive</span>}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400">
                  <span>{e.questions?.length || 0} questions</span>
                  <span>·</span>
                  <span>{e.duration} min</span>
                  <span>·</span>
                  <span>Pass: {e.passingScore}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(e)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title={e.isActive ? 'Deactivate' : 'Activate'}
                >
                  {e.isActive ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} />}
                </button>
                <Link to={`/admin/exams/${e._id}/edit`} className="p-2 rounded-lg text-slate-400 hover:text-primary-400 transition-colors">
                  <Edit3 size={18} />
                </Link>
                <button onClick={() => deleteExam(e._id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
