import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam } from '../context/ExamContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Send, Flag, Monitor, Camera } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as faceapi from 'face-api.js';

// Shuffle helper
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Adaptive: given last answer result, filter next question
function getNextAdaptiveQuestion(questions, lastDifficulty, lastCorrect, usedIds) {
  const nextDiff =
    lastCorrect === null ? 'easy' :
    lastCorrect && lastDifficulty === 'easy' ? 'medium' :
    lastCorrect && lastDifficulty === 'medium' ? 'hard' :
    lastCorrect && lastDifficulty === 'hard' ? 'hard' :
    !lastCorrect && lastDifficulty === 'hard' ? 'medium' :
    !lastCorrect && lastDifficulty === 'medium' ? 'easy' : 'easy';

  const pool = questions.filter((q) => !usedIds.has(q._id) && q.difficulty === nextDiff);
  if (pool.length) return pool[0];
  // fallback: any unused question
  return questions.find((q) => !usedIds.has(q._id)) || null;
}

export default function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { cheatingLog, recordEvent, suspicionScore } = useExam();

  const [exam, setExam] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]); // ordered for display
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> selectedIndex
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState({});

  const [examStarted, setExamStarted] = useState(false);
  const videoRef = useRef(null);
  const [showCheatWarning, setShowCheatWarning] = useState(false);

  const idleTimer = useRef(null);
  const allQuestionsRef = useRef([]);
  const usedIdsRef = useRef(new Set());
  const streamRef = useRef(null); // Screen stream
  const webcamRef = useRef(null); // Webcam stream
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const missingFaceCountRef = useRef(0);
  const noiseCountRef = useRef(0);

  // Cheating detection: tab visibility & blur
  useEffect(() => {
    if (!examStarted) return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        recordEvent('tab');
        setShowCheatWarning(true);
      }
    };
    const onBlur = () => {
      recordEvent('tab');
      setShowCheatWarning(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [recordEvent, examStarted]);

  // Cheating detection: window resize
  useEffect(() => {
    if (!examStarted) return;
    const onResize = () => recordEvent('resize');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recordEvent, examStarted]);

  // Cheating detection: right click, copy
  useEffect(() => {
    if (!examStarted) return;
    const onCtxMenu = (e) => { e.preventDefault(); recordEvent('rightclick'); };
    const onCopy = (e) => { e.preventDefault(); recordEvent('copy'); addToast('⚠️ Copy is disabled during exam', 'warning'); };
    document.addEventListener('contextmenu', onCtxMenu);
    document.addEventListener('copy', onCopy);
    return () => { document.removeEventListener('contextmenu', onCtxMenu); document.removeEventListener('copy', onCopy); };
  }, [recordEvent, addToast, examStarted]);

  // Idle detection
  const resetIdle = useCallback(() => {
    if (!examStarted) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      recordEvent('idle');
      addToast('⚠️ Idle detected!', 'warning');
    }, 30000);
  }, [recordEvent, addToast, examStarted]);

  useEffect(() => {
    if (!examStarted) return;
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    resetIdle();
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearTimeout(idleTimer.current);
    };
  }, [resetIdle, examStarted]);

  // Periodic Screenshot capture
  useEffect(() => {
    if (!examStarted || !attemptId || !videoRef.current) return;
    const interval = setInterval(() => {
       try {
         const video = videoRef.current;
         if (video.videoWidth === 0) return;
         const canvas = document.createElement('canvas');
         canvas.width = video.videoWidth;
         canvas.height = video.videoHeight;
         const ctx = canvas.getContext('2d');
         ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
         const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
         api.post(`/attempts/${attemptId}/screenshot`, { image: dataUrl }).catch(() => {});
       } catch (err) {
         console.error('Screenshot err:', err);
       }
    }, 15000); // 15s for demo
    return () => clearInterval(interval);
  }, [examStarted, attemptId]);

  // AI Proctoring (Face & Audio Tracking)
  useEffect(() => {
    if (!examStarted || !webcamRef.current) return;
    let isActive = true;

    const runAnalysis = async () => {
      // 1. Microphone Analysis
      if (analyserRef.current) {
         const bufferLength = analyserRef.current.frequencyBinCount;
         const dataArray = new Uint8Array(bufferLength);
         analyserRef.current.getByteFrequencyData(dataArray);
         const avgVolume = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
         if (avgVolume > 60) { // arbitrary threshold for talking
            noiseCountRef.current += 1;
            if (noiseCountRef.current >= 3) {
               addToast('⚠️ Sustained Noise/Talking detected!', 'warning');
               recordEvent('idle'); // adds minor suspicion
               noiseCountRef.current = 0;
            }
         } else {
            noiseCountRef.current = 0;
         }
      }

      // 2. Face Tracking Analysis
      try {
         const detections = await faceapi.detectAllFaces(webcamRef.current, new faceapi.TinyFaceDetectorOptions());
         if (detections.length === 0) {
            missingFaceCountRef.current += 1;
            if (missingFaceCountRef.current >= 3) {
               addToast('⚠️ Face not detected consistently! Please face the camera directly.', 'error');
               recordEvent('tab'); 
               missingFaceCountRef.current = 0;
            }
         } else if (detections.length > 1) {
            addToast('⚠️ MULTIPLE FACES DETECTED! Examination compromised.', 'error');
            recordEvent('tab'); recordEvent('tab'); // Double penalty
            missingFaceCountRef.current = 0;
         } else {
            missingFaceCountRef.current = 0;
         }
      } catch (err) {
         console.error('FaceAPI Error:', err);
      }

      if (isActive) setTimeout(runAnalysis, 3000); // Run every 3 seconds
    };

    runAnalysis();

    return () => { isActive = false; };
  }, [examStarted, addToast, recordEvent]);

  // Load exam metadata on mount
  useEffect(() => {
    api.get(`/exams/${examId}`)
       .then(r => { setExam(r.data); setLoading(false); })
       .catch(() => { addToast('Failed to load exam', 'error'); navigate('/student/exams'); });
  }, [examId]);

  const startExamSession = async () => {
    try {
      // Load neural net weights
      addToast('Loading AI Proctoring models...', 'info');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');

      // Request media streams
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      streamRef.current = screenStream;
      if (videoRef.current) videoRef.current.srcObject = screenStream;
      if (webcamRef.current) webcamRef.current.srcObject = userStream;

      // Audio frequency setup
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(userStream);
      source.connect(analyser);
      analyser.fftSize = 256;
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      addToast('Hardware access verified. Starting exam...', 'success');
      
      const attemptRes = await api.post('/attempts/start', { examId });
      setAttemptId(attemptRes.data._id);
      setTimeLeft(exam.duration * 60);

      const shuffled = shuffle(exam.questions);
      allQuestionsRef.current = shuffled;

      if (exam.adaptive) {
        const first = getNextAdaptiveQuestion(shuffled, null, null, new Set());
        if (first) {
          usedIdsRef.current.add(first._id);
          setQuestions([first]);
        }
      } else {
        setQuestions(shuffled);
      }
      
      setExamStarted(true);
      setQuestionStartTime(Date.now());

      streamRef.current.getVideoTracks()[0].onended = () => {
         addToast('⚠️ Screen sharing stopped! Exam flagged.', 'error');
         recordEvent('tab');
         setShowCheatWarning(true);
      };
    } catch (err) {
      console.error(err);
      addToast('Screen sharing AND Webcam access are mandatory.', 'error');
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!exam || timeLeft <= 0 || !examStarted) return;
    const t = setInterval(() => setTimeLeft((s) => {
      if (s <= 1) { clearInterval(t); handleSubmit(true); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [exam, timeLeft <= 1, examStarted]);

  const currentQuestion = questions[currentIdx];

  const handleAnswer = useCallback((selectedIndex) => {
    if (!currentQuestion) return;
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    setTimeTaken((prev) => ({ ...prev, [currentQuestion._id]: elapsed }));
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: selectedIndex }));

    if (exam?.adaptive) {
      const lastCorrect = null; // we don't know until submit — optimistic progression
      const nextQ = getNextAdaptiveQuestion(
        allQuestionsRef.current,
        currentQuestion.difficulty,
        true, // optimistic
        usedIdsRef.current
      );
      if (nextQ && !questions.find((q) => q._id === nextQ._id)) {
        usedIdsRef.current.add(nextQ._id);
        setQuestions((prev) => [...prev, nextQ]);
      }
    }
  }, [currentQuestion, questionStartTime, exam, questions]);

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const n = new Set(prev);
      currentQuestion && (n.has(currentQuestion._id) ? n.delete(currentQuestion._id) : n.add(currentQuestion._id));
      return n;
    });
  };

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    
    // Stop streams
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (webcamRef.current && webcamRef.current.srcObject) {
        webcamRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(()=>{});
    }

    try {
      const answerArr = Object.entries(answers).map(([questionId, ans]) => {
        const isCode = typeof ans === 'object' && ans !== null;
        return {
          questionId,
          selectedIndex: isCode ? undefined : ans,
          codeAnswer: isCode ? ans.codeAnswer : undefined,
          timeTaken: timeTaken[questionId] || 0,
        };
      });
      const totalTime = exam ? exam.duration * 60 - timeLeft : 0;
      const res = await api.post(`/attempts/${attemptId}/submit`, {
        answers: answerArr,
        cheatingLog: { ...cheatingLog, suspicionScore: suspicionScore() },
        timeTaken: totalTime,
      });
      if (auto) addToast('⏱️ Time up! Exam auto-submitted.', 'warning');
      else addToast('Exam submitted successfully!', 'success');
      navigate(`/student/results/${res.data._id}`);
    } catch {
      addToast('Submission failed. Try again.', 'error');
      setSubmitting(false);
    }
  }, [submitting, answers, attemptId, cheatingLog, suspicionScore, exam, timeLeft, timeTaken, navigate, addToast]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const score = useMemo(() => suspicionScore(), [cheatingLog]);
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const timerDanger = timeLeft < 120;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      {/* Absolute hidden instead of display hidden so frames render properly for FaceAPI */}
      <video ref={webcamRef} autoPlay playsInline muted className="absolute opacity-0 pointer-events-none w-64 h-48 -z-50" />
      
      {!examStarted ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card text-center max-w-md w-full border border-indigo-500/20 shadow-xl shadow-indigo-900/10">
            <Monitor size={48} className="text-primary-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-2">{exam?.title}</h2>
            <p className="text-slate-400 mb-6 font-medium text-sm leading-relaxed">
              AI Proctoring Enabled. <br/><br/>
              This exam requires your <span className="text-indigo-400 font-bold">Screen</span>, <span className="text-indigo-400 font-bold">Microphone</span>, and <span className="text-indigo-400 font-bold">Webcam</span>. Face detection neural networks will track you dynamically to ensure no multi-person assistance or off-screen reading is taking place.
            </p>
            <button onClick={startExamSession} className="btn-primary w-full flex items-center gap-2 justify-center py-4 bg-indigo-600 hover:bg-indigo-500 font-mono shadow-lg shadow-indigo-600/30">
              <Camera size={18} /> Authorize hardware & Begin
            </button>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">
              Models process data locally in your browser. Video is NOT permanently stored on the cloud.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header bar */}
          <div className="sticky top-0 z-40 bg-brand-card/90 backdrop-blur-md border-b border-brand-border">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold px-2 py-1 bg-emerald-900/50 text-emerald-400 rounded-lg animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                   Screen Being Recorded
                </div>
                <div>
                  <p className="font-semibold text-white truncate max-w-xs">{exam?.title}</p>
                  <p className="text-xs text-slate-400">{answeredCount}/{questions.length} answered</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Suspicion score */}
                {score > 0 && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    score >= 50 ? 'bg-red-900/60 text-red-300' : 'bg-amber-900/60 text-amber-300'
                  }`}>
                    <AlertTriangle size={12} />
                    Suspicion: {score}%
                  </div>
                )}
                {/* Timer */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg ${
                  timerDanger ? 'bg-red-900/70 text-red-300 animate-pulse' : 'bg-brand-dark text-white'
                }`}>
                  <Clock size={18} />
                  {formatTime(timeLeft)}
                </div>
                <button onClick={() => handleSubmit(false)} disabled={submitting} className="btn-primary flex items-center gap-2">
                  <Send size={14} />
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-brand-dark">
              <div
                className="h-1 bg-primary-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
            {/* Question panel */}
            <div className="flex-1 min-w-0">
              {currentQuestion ? (
                <div className="card animate-fade-in">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                        {currentIdx + 1}
                      </span>
                      <span className={`badge ${
                        currentQuestion.difficulty === 'easy' ? 'bg-emerald-900 text-emerald-300' :
                        currentQuestion.difficulty === 'medium' ? 'bg-amber-900 text-amber-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {currentQuestion.difficulty}
                      </span>
                      {currentQuestion.topic && (
                        <span className="badge bg-slate-700 text-slate-300">{currentQuestion.topic}</span>
                      )}
                    </div>
                    <button onClick={toggleFlag} className={`p-2 rounded-lg transition-colors ${
                      flagged.has(currentQuestion._id) ? 'bg-amber-600 text-white' : 'bg-brand-dark text-slate-400 hover:text-amber-400'
                    }`}>
                      <Flag size={16} />
                    </button>
                  </div>

                  <p className="text-white text-lg font-medium leading-relaxed mb-8 whitespace-pre-wrap font-mono">{currentQuestion.text}</p>

                  {currentQuestion.type === 'code' ? (
                    <div className="h-80 rounded-xl overflow-hidden border-2 border-brand-border">
                      <Editor
                        height="100%"
                        defaultLanguage="javascript"
                        theme="vs-dark"
                        value={answers[currentQuestion._id]?.codeAnswer || currentQuestion.initialCode || '// Write your code here...'}
                        onChange={(val) => {
                          const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
                          setTimeTaken((prev) => ({ ...prev, [currentQuestion._id]: elapsed }));
                          setAnswers((prev) => ({ ...prev, [currentQuestion._id]: { codeAnswer: val } }));
                        }}
                        options={{ minimap: { enabled: false }, fontSize: 14, tabSize: 2 }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentQuestion.options.map((opt, idx) => {
                        const selected = answers[currentQuestion._id] === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                              selected
                                ? 'border-primary-500 bg-primary-900/40 text-white'
                                : 'border-brand-border bg-brand-dark text-slate-300 hover:border-slate-500 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                selected ? 'border-primary-400 bg-primary-600 text-white' : 'border-slate-600 text-slate-400'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-brand-border">
                    <button onClick={handlePrev} disabled={currentIdx === 0} className="btn-secondary flex items-center gap-2">
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-slate-500 text-sm">{currentIdx + 1} / {questions.length}</span>
                    <button onClick={handleNext} disabled={currentIdx === questions.length - 1} className="btn-secondary flex items-center gap-2">
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-16 text-slate-400">No more questions available.</div>
              )}
            </div>

            {/* Question palette sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="card sticky top-24">
                <h3 className="text-sm font-semibold text-white mb-4">Question Palette</h3>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {questions.map((q, idx) => {
                    const isAnswered = answers[q._id] !== undefined;
                    const isFlagged = flagged.has(q._id);
                    const isCurrent = idx === currentIdx;
                    return (
                      <button
                        key={q._id}
                        onClick={() => { setCurrentIdx(idx); setQuestionStartTime(Date.now()); }}
                        className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                          isCurrent ? 'ring-2 ring-primary-400 scale-110' :
                          isFlagged ? 'bg-amber-600 text-white' :
                          isAnswered ? 'bg-emerald-700 text-white' :
                          'bg-brand-dark text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-700 rounded" /> Answered</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-600 rounded" /> Flagged</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-brand-dark border border-slate-600 rounded" /> Not visited</div>
                </div>

                <div className="mt-6 pt-4 border-t border-brand-border">
                  <p className="text-xs text-slate-400 mb-2">Behavior Tracking</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Tab switches</span>
                      <span className="text-white">{cheatingLog.tabSwitches}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Resize events</span>
                      <span className="text-white">{cheatingLog.windowResizes}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Idle warnings</span>
                      <span className="text-white">{cheatingLog.idleEvents}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showCheatWarning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-red-900 border border-red-500 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl shadow-red-900/50">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <AlertTriangle size={36} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">WARNING: Tab Shift Detected</h2>
                <p className="text-red-200 mb-8">
                  You clicked outside the exam window or switched tabs. This has been explicitly recorded into your suspicion logs as a Cheating Violation. Repeated offenses will flag your score to the Admin.
                </p>
                <button 
                  onClick={() => setShowCheatWarning(false)}
                  className="bg-red-500 hover:bg-red-400 text-white font-bold w-full py-4 rounded-xl transition-all active:scale-95 text-lg"
                >
                  I Understand, Return to Exam
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
