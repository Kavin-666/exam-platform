import { useState, useEffect } from 'react';
import { Trophy, Clock, Target, Medal } from 'lucide-react';
import Layout from '../components/UI/Layout';
import api from '../services/api';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attempts/leaderboard')
      .then(r => setLeaders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-12">
           <Trophy size={64} className="text-amber-400 mx-auto mb-4" />
           <h1 className="text-4xl font-bold text-white mb-2">Global Leaderboard</h1>
           <p className="text-slate-400">Top 50 Students worldwide ranked by percentile and speed</p>
        </div>

        <div className="card overflow-hidden p-0 border border-amber-500/20 shadow-2xl shadow-amber-900/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-dark/50 border-b border-brand-border text-slate-400 text-sm font-semibold">
                <th className="p-4 px-6">Rank</th>
                <th className="p-4">Student</th>
                <th className="p-4">Exam</th>
                <th className="p-4">Score</th>
                <th className="p-4">Time Taken</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((attempt, idx) => (
                <tr 
                  key={attempt._id} 
                  className={`border-b border-brand-border/50 hover:bg-slate-800/50 transition-colors ${
                    idx === 0 ? 'bg-amber-900/10' : 
                    idx === 1 ? 'bg-slate-700/10' : 
                    idx === 2 ? 'bg-orange-900/10' : ''
                  }`}
                >
                  <td className="p-4 px-6">
                    <div className="flex items-center gap-2 font-bold text-lg">
                      {idx === 0 && <Medal className="text-amber-400" size={24} />}
                      {idx === 1 && <Medal className="text-slate-300" size={24} />}
                      {idx === 2 && <Medal className="text-orange-400" size={24} />}
                      {idx > 2 && <span className="text-slate-500 w-6 text-center">{idx + 1}</span>}
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-white">{attempt.userId?.name || 'Anonymous'}</td>
                  <td className="p-4 text-slate-300 text-sm">{attempt.examId?.title}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                       <Target size={16} className={attempt.percentage >= 80 ? 'text-emerald-400' : 'text-slate-400'} />
                       <span className={`font-bold ${attempt.percentage >= 80 ? 'text-emerald-400' : 'text-white'}`}>
                         {attempt.percentage}%
                       </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Clock size={14} />
                      {attempt.timeTaken}s
                    </div>
                  </td>
                </tr>
              ))}
              {leaders.length === 0 && (
                <tr>
                   <td colSpan={5} className="p-8 text-center text-slate-500">No completed attempts yet. Be the first!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
