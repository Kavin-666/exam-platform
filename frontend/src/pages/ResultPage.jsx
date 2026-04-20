import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/UI/Layout';
import api from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Clock, Award, Home, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import confetti from 'canvas-confetti';

export default function ResultPage() {
  const { attemptId } = useParams();
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    api.get(`/attempts/${attemptId}`).then(r => {
      setAttempt(r.data);
      setInsightLoading(true);
      api.post('/analytics/insights', { attemptId: r.data._id })
         .then(res => setInsight(res.data.insight))
         .catch(err => console.error('Failed to load insight', err))
         .finally(() => setInsightLoading(false));
    }).finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!attempt) return null;

  const downloadCertificate = async () => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    
    const certRef = document.getElementById('certificate-node');
    if (certRef) {
       certRef.style.display = 'flex'; // show momentarily
       const canvas = await html2canvas(certRef, { scale: 2, useCORS: true });
       certRef.style.display = 'none'; // hide again
       
       const imgData = canvas.toDataURL('image/png');
       const pdf = new jsPDF('landscape', 'mm', 'a4');
       pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
       pdf.save(`${attempt.examId.title.replace(/\s+/g, '_')}_Certificate.pdf`);
    }
  };

  const { score, totalQuestions, percentage, passed, cheatingLog, answers, examId } = attempt;
  const suspicion = cheatingLog?.suspicionScore || 0;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-slide-up">
        {/* Score hero */}
        <div className={`card text-center mb-8 border-2 ${passed ? 'border-emerald-600' : 'border-red-600'}`}>
          <div className="flex items-center justify-center mb-4">
            {passed ? (
              <Award size={64} className="text-emerald-400" />
            ) : (
              <XCircle size={64} className="text-red-400" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{percentage}%</h1>
          <p className={`text-xl font-semibold ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
            {passed ? '🎉 Passed!' : 'Failed — Try Again!'}
          </p>
          <p className="text-slate-400 mt-2">{score} out of {totalQuestions} correct</p>
          {examId?.title && <p className="text-slate-500 text-sm mt-1">{examId.title}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{score}</p>
            <p className="text-slate-400 text-sm">Correct</p>
          </div>
          <div className="card text-center">
            <XCircle size={24} className="text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalQuestions - score}</p>
            <p className="text-slate-400 text-sm">Wrong</p>
          </div>
          <div className={`card text-center border ${suspicion >= 50 ? 'border-red-600' : 'border-brand-border'}`}>
            <AlertTriangle size={24} className={`mx-auto mb-2 ${suspicion >= 50 ? 'text-red-400' : 'text-amber-400'}`} />
            <p className="text-2xl font-bold text-white">{suspicion}%</p>
            <p className="text-slate-400 text-sm">Suspicion</p>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="card mb-8 border border-indigo-500/30 bg-indigo-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm pointer-events-none">
            {/* Sparkles decoration */}
            <span className="text-6xl">✨</span>
          </div>
          <h2 className="text-lg font-semibold text-indigo-400 mb-3 flex items-center gap-2">
            ✨ AI Smart Insights
          </h2>
          {insightLoading ? (
            <div className="flex items-center gap-3 text-indigo-300 animate-pulse">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Generating personalized feedback...
            </div>
          ) : (
            <p className="text-indigo-100/90 leading-relaxed text-sm whitespace-pre-wrap">{insight}</p>
          )}
        </div>

        {/* Behavior summary */}
        {cheatingLog && Object.keys(cheatingLog).length > 0 && (cheatingLog.tabSwitches > 0 || cheatingLog.windowResizes > 0) && (
          <div className="card mb-8 border-amber-800">
            <h2 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle size={18} /> Behavior Report
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between p-3 bg-brand-dark rounded-xl">
                <span className="text-slate-400">Tab Switches</span>
                <span className="text-white font-semibold">{cheatingLog.tabSwitches}</span>
              </div>
              <div className="flex justify-between p-3 bg-brand-dark rounded-xl">
                <span className="text-slate-400">Window Resizes</span>
                <span className="text-white font-semibold">{cheatingLog.windowResizes}</span>
              </div>
              <div className="flex justify-between p-3 bg-brand-dark rounded-xl">
                <span className="text-slate-400">Idle Warnings</span>
                <span className="text-white font-semibold">{cheatingLog.idleEvents}</span>
              </div>
              <div className="flex justify-between p-3 bg-brand-dark rounded-xl">
                <span className="text-slate-400">Copy Attempts</span>
                <span className="text-white font-semibold">{cheatingLog.copyAttempts}</span>
              </div>
            </div>
          </div>
        )}

        {/* Answer breakdown */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Answer Breakdown</h2>
          <div className="space-y-2">
            {answers.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-brand-dark rounded-xl">
                <div className="flex items-center gap-3">
                  {a.isCorrect ? (
                    <CheckCircle size={16} className="text-emerald-400" />
                  ) : (
                    <XCircle size={16} className="text-red-400" />
                  )}
                  <span className="text-slate-300 text-sm">Question {idx + 1}</span>
                  <span className={`badge text-xs ${
                    a.difficulty === 'easy' ? 'bg-emerald-900 text-emerald-300' :
                    a.difficulty === 'medium' ? 'bg-amber-900 text-amber-300' :
                    'bg-red-900 text-red-300'
                  }`}>{a.difficulty}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock size={12} />
                  {a.timeTaken || 0}s
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Link to="/student" className="btn-secondary flex items-center gap-2 flex-1 justify-center">
            <Home size={16} /> Dashboard
          </Link>
          {passed && (
            <button onClick={downloadCertificate} className="btn-primary flex items-center gap-2 flex-1 justify-center bg-amber-600 hover:bg-amber-500 border border-amber-400">
              <Download size={16} /> Download Certificate
            </button>
          )}
          <Link to="/student/exams" className="btn-primary flex items-center gap-2 flex-1 justify-center">
            Try Another Exam →
          </Link>
        </div>
      </div>

      {/* Hidden Certificate Node for html2canvas */}
      <div id="certificate-node" className="hidden fixed -z-50 top-0 left-0 w-[1122px] h-[793px] bg-white flex-col items-center justify-center border-[20px] border-indigo-900 px-16 text-center">
         {/* Decorative corners */}
         <div className="absolute top-0 left-0 w-32 h-32 border-b-[20px] border-r-[20px] border-indigo-900"></div>
         <div className="absolute bottom-0 right-0 w-32 h-32 border-t-[20px] border-l-[20px] border-indigo-900"></div>
         
         <Award size={120} className="text-amber-500 mb-8" />
         <h1 className="text-6xl font-serif font-bold text-indigo-900 mb-6 uppercase tracking-widest">Certificate of Completion</h1>
         <p className="text-2xl text-slate-600 mb-8 italic">This is proudly presented to</p>
         <h2 className="text-5xl font-bold text-slate-900 mb-8 pb-4 border-b-2 border-indigo-200 inline-block px-16">The Examinee</h2>
         <p className="text-2xl text-slate-600 mb-6 italic">for successfully passing the assessment</p>
         <h3 className="text-4xl font-bold text-indigo-800 mb-12">{attempt.examId.title}</h3>
         
         <div className="flex justify-between w-full mt-16 px-32 text-center">
            <div>
               <p className="text-3xl font-bold text-slate-800 border-b-2 border-slate-400 pb-2 mb-2">{attempt.percentage}%</p>
               <p className="text-lg text-slate-500 uppercase tracking-wider">Final Score</p>
            </div>
            <div>
               <p className="text-3xl font-bold text-slate-800 border-b-2 border-slate-400 pb-2 mb-2">{new Date(attempt.completedAt).toLocaleDateString()}</p>
               <p className="text-lg text-slate-500 uppercase tracking-wider">Date Passed</p>
            </div>
         </div>
      </div>
    </Layout>
  );
}
