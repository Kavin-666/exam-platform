import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/UI/Layout';
import api from '../services/api';
import { Clock, BookOpen, ChevronRight, Layers } from 'lucide-react';

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exams').then(r => setExams(r.data)).finally(() => setLoading(false));
  }, []);

  const difficultyColor = { easy: 'bg-emerald-900 text-emerald-300', medium: 'bg-amber-900 text-amber-300', hard: 'bg-red-900 text-red-300' };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Available Exams</h1>
        <p className="text-slate-400 mt-1">Select an exam to begin your session</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-44" />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No exams available right now.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <Link
              key={exam._id}
              to={`/student/exam/${exam._id}`}
              className="card group hover:border-primary-500 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
                  <BookOpen size={18} className="text-primary-400" />
                </div>
                {exam.adaptive && (
                  <span className="badge bg-purple-900 text-purple-300 flex items-center gap-1">
                    <Layers size={10} /> Adaptive
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{exam.title}</h3>
              {exam.description && <p className="text-sm text-slate-400 mb-4 line-clamp-2">{exam.description}</p>}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Clock size={13} /> {exam.duration} min</span>
                <span className="flex items-center gap-1.5"><BookOpen size={13} /> {exam.questions?.length || 0} questions</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-brand-border">
                <span className="text-xs text-slate-400">Pass: {exam.passingScore}%</span>
                <span className="text-primary-400 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Start <ChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
