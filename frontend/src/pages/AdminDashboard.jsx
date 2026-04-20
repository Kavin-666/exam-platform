import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/UI/Layout';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, BookOpen, AlertTriangle, TrendingUp, Plus, Trophy } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [statsRes, examsRes] = await Promise.all([
          api.get('/analytics/admin'),
          api.get('/exams'),
        ]);
        setStats(statsRes.data);
        setExams(examsRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const leaderboardChart = useMemo(
    () => stats?.leaderboard?.map((l) => ({ name: l.name?.split(' ')[0], score: l.score })) || [],
    [stats]
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Platform overview and exam management</p>
        </div>
        <Link to="/admin/exams/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Exam
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Students" value={loading ? '...' : stats?.totalUsers ?? 0} color="bg-primary-600" />
        <StatCard icon={BookOpen} label="Total Attempts" value={loading ? '...' : stats?.totalAttempts ?? 0} color="bg-emerald-600" />
        <StatCard icon={TrendingUp} label="Avg Score" value={loading ? '...' : `${stats?.avgScore ?? 0}%`} color="bg-teal-600" />
        <StatCard icon={AlertTriangle} label="Flagged" value={loading ? '...' : stats?.totalFlagged ?? 0} color="bg-red-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" /> Leaderboard (Top 10)
          </h2>
          {leaderboardChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leaderboardChart}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
                <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No attempts yet</div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" /> Cheating Flags
          </h2>
          {stats?.flaggedAttempts?.length === 0 ? (
            <p className="text-slate-400 text-sm">No flagged attempts 🎉</p>
          ) : (
            <div className="space-y-3">
              {(stats?.flaggedAttempts || []).slice(0, 5).map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-red-900/20 border border-red-900/50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-white">{f.userName}</p>
                    <p className="text-xs text-slate-400">{f.exam}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold text-sm">{f.suspicionScore}%</p>
                    <p className="text-xs text-slate-500">{f.tabSwitches} tabs</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Your Exams</h2>
          <Link to="/admin/exams" className="text-primary-400 text-sm hover:text-primary-300">View all →</Link>
        </div>
        {exams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-4">No exams created yet.</p>
            <Link to="/admin/exams/new" className="btn-primary">Create your first exam</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.slice(0, 6).map((e) => (
              <Link key={e._id} to={`/admin/exams/${e._id}/edit`} className="p-4 bg-brand-dark rounded-xl hover:border hover:border-primary-600 border border-transparent transition-all">
                <h3 className="font-semibold text-white">{e.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{e.questions?.length || 0} questions · {e.duration} min</p>
                <span className={`badge mt-2 ${e.isActive ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                  {e.isActive ? 'Active' : 'Inactive'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
