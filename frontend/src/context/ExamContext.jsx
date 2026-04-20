import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const [currentExam, setCurrentExam] = useState(null);
  const [currentAttemptId, setCurrentAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [cheatingLog, setCheatingLog] = useState({
    tabSwitches: 0,
    windowResizes: 0,
    idleEvents: 0,
    rightClickAttempts: 0,
    copyAttempts: 0,
    events: [],
  });

  const recordEvent = useCallback((type) => { console.log('CHEAT DETECTED: ', type);
    setCheatingLog((prev) => {
      const key =
        type === 'tab' ? 'tabSwitches' :
        type === 'resize' ? 'windowResizes' :
        type === 'idle' ? 'idleEvents' :
        type === 'rightclick' ? 'rightClickAttempts' :
        type === 'copy' ? 'copyAttempts' : null;
      return {
        ...prev,
        ...(key ? { [key]: prev[key] + 1 } : {}),
        events: [...prev.events, { type, timestamp: new Date().toISOString() }],
      };
    });
  }, []);

  const suspicionScore = useCallback(() => {
    const s =
      cheatingLog.tabSwitches * 10 +
      cheatingLog.windowResizes * 5 +
      cheatingLog.idleEvents * 5 +
      cheatingLog.copyAttempts * 8;
    return Math.min(s, 100);
  }, [cheatingLog]);

  const saveAnswer = useCallback((questionId, selectedIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedIndex }));
  }, []);

  const resetExam = useCallback(() => {
    setCurrentExam(null);
    setCurrentAttemptId(null);
    setAnswers({});
    setCurrentQuestionIdx(0);
    setCheatingLog({ tabSwitches: 0, windowResizes: 0, idleEvents: 0, rightClickAttempts: 0, copyAttempts: 0, events: [] });
  }, []);

  return (
    <ExamContext.Provider
      value={{
        currentExam, setCurrentExam,
        currentAttemptId, setCurrentAttemptId,
        answers, saveAnswer,
        currentQuestionIdx, setCurrentQuestionIdx,
        cheatingLog, recordEvent, suspicionScore,
        resetExam,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export const useExam = () => useContext(ExamContext);
