import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/UI/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import { TrendingUp, BookOpen, CheckCircle, XCircle, Award, AlertTriangle, Trophy } from 'lucide-react';

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

function SkeletonCard() {
  return <div className="skeleton h-28 rounded-2xl" />;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [statsRes, attRes] = await Promise.all([
          api.get('/analytics/student'),
          api.get('/attempts/my'),
        ]);
        setStats(statsRes.data);
        setAttempts(attRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const radarData = useMemo(() => {
    if (!stats?.topicBreakdown) return [];
    return Object.entries(stats.topicBreakdown).map(([key, val]) => ({
      subject: key.charAt(0).toUpperCase() + key.slice(1),
      accuracy: val.total ? Math.round((val.correct / val.total) * 100) : 0,
    }));
  }, [stats]);

  return (
    <Layout>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, <span className="text-primary-400">{user?.name}</span> 👋
          </h1>
          <p className="text-slate-400 mt-1">Track your performance and take new exams below.</p>
        </div>
        <Link to="/leaderboard" className="btn-secondary flex items-center gap-2 border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400">
          <Trophy size={18} /> Leaderboard
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={BookOpen} label="Total Attempts" value={stats?.totalAttempts ?? 0} color="bg-primary-600" />
          <StatCard icon={TrendingUp} label="Average Score" value={`${stats?.avgScore ?? 0}%`} color="bg-emerald-600" />
          <StatCard icon={CheckCircle} label="Passed" value={stats?.passed ?? 0} color="bg-teal-600" />
          <StatCard icon={XCircle} label="Failed" value={stats?.failed ?? 0} color="bg-red-600" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-400" /> Score History
          </h2>
          {stats?.scoreHistory?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.scoreHistory}>
                <XAxis dataKey="exam" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              No attempts yet — take your first exam!
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-400" /> Difficulty Accuracy
          </h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Radar name="Accuracy" dataKey="accuracy" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">No data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Attempts</h2>
        {attempts.length === 0 ? (
          <p className="text-slate-400 text-sm">No attempts yet.</p>
        ) : (
          <div className="space-y-3">
            {attempts.slice(0, 5).map((a) => (
              <Link
                key={a._id}
                to={`/student/results/${a._id}`}
                className="flex items-center justify-between p-4 bg-brand-dark rounded-xl hover:border hover:border-primary-600 transition-all"
              >
                <div>
                  <p className="font-medium text-white">{a.examId?.title || 'Unknown Exam'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {a.completedAt ? new Date(a.completedAt).toLocaleDateString() : 'In Progress'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {a.cheatingLog?.suspicionScore > 40 && (
                    <span className="badge bg-red-900 text-red-300 flex items-center gap-1">
                      <AlertTriangle size={10} /> Flagged
                    </span>
                  )}
                  <span className={`text-2xl font-bold ${a.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                    {a.percentage}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link to="/student/exams" className="btn-primary mt-4 inline-flex">Browse Exams →</Link>
      </div>
    </Layout>
  );
}
