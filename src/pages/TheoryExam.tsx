import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { questionBank } from '../data/questions';
import type { TheoryQuestion } from '../data/questions';
import { useLang } from '../contexts/LanguageContext';
import './TheoryExam.css';

const TOTAL_QUESTIONS = 30;
const TIME_LIMIT_SECONDS = 20 * 60; // 20 minutes
const PASS_SCORE = 27;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getQuestions(bank: TheoryQuestion[]): TheoryQuestion[] {
  // Ensure category coverage: draw from each category proportionally
  const categories = ['signs', 'rules', 'safety', 'vehicle', 'firstAid', 'ecology', 'legal'];
  const targets: Record<string, number> = {
    signs: 9, rules: 7, safety: 5, vehicle: 3, firstAid: 3, ecology: 1, legal: 2
  };
  const result: TheoryQuestion[] = [];
  categories.forEach(cat => {
    const pool = bank.filter(q => q.category === cat);
    const shuffled = shuffleArray(pool);
    result.push(...shuffled.slice(0, targets[cat]));
  });

  // Fill in any remaining slots if the category pools fell short
  if (result.length < TOTAL_QUESTIONS) {
    const selectedIds = new Set(result.map(q => q.id));
    const remainingPool = bank.filter(q => !selectedIds.has(q.id));
    const shuffledRemaining = shuffleArray(remainingPool);
    const needed = TOTAL_QUESTIONS - result.length;
    result.push(...shuffledRemaining.slice(0, needed));
  }

  return shuffleArray(result).slice(0, TOTAL_QUESTIONS);
}

type AnswerState = 'unanswered' | 'answered' | 'skipped' | 'flagged';

interface QuestionState {
  question: TheoryQuestion;
  selectedOption: number | null;
  state: AnswerState;
  revealed?: boolean;
}

const TheoryExam: React.FC = () => {
  const { t } = useTranslation();
  const { lang } = useLang();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
  const [examDone, setExamDone] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize exam
  useEffect(() => {
    const qs = getQuestions(questionBank);
    setQuestions(qs.map(q => ({ question: q, selectedOption: null, state: 'unanswered', revealed: false })));
    setTimeLeft(TIME_LIMIT_SECONDS);
    setExamDone(false);
  }, []);

  // Timer
  useEffect(() => {
    if (examDone || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [examDone, questions.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isUrgent = timeLeft < 120; // last 2 minutes

  const selectOption = (optionIdx: number) => {
    if (examDone || current.revealed) return;
    setQuestions(prev => prev.map((q, i) =>
      i === currentIdx
        ? { ...q, selectedOption: optionIdx, state: 'answered' }
        : q
    ));
  };

  const toggleFlag = () => {
    setQuestions(prev => prev.map((q, i) =>
      i === currentIdx
        ? { ...q, state: q.state === 'flagged' ? (q.selectedOption !== null ? 'answered' : 'unanswered') : 'flagged' }
        : q
    ));
  };

  const goTo = (idx: number) => setCurrentIdx(idx);

  const goNext = () => {
    const current = questions[currentIdx];
    if (current.selectedOption !== null && !current.revealed) {
      setQuestions(prev => prev.map((q, i) =>
        i === currentIdx
          ? { ...q, revealed: true }
          : q
      ));
    } else {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(i => i + 1);
      }
    }
  };

  const goPrev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };

  const handleSubmitAction = () => {
    const current = questions[currentIdx];
    if (current.selectedOption !== null && !current.revealed) {
      setQuestions(prev => prev.map((q, i) =>
        i === currentIdx
          ? { ...q, revealed: true }
          : q
      ));
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const skipQuestion = () => {
    setQuestions(prev => prev.map((q, i) =>
      i === currentIdx && q.state === 'unanswered'
        ? { ...q, state: 'skipped' }
        : q
    ));
    goNext();
  };

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Save history
    try {
      const correct = questions.filter(q => q.selectedOption === q.question.correct).length;
      const history = JSON.parse(localStorage.getItem('examHistory') || '[]');
      const elapsed = TIME_LIMIT_SECONDS - timeLeft;
      const record = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString(),
        type: 'theory',
        score: correct,
        maxScore: 30,
        passed: correct >= PASS_SCORE,
        duration: elapsed
      };
      history.unshift(record);
      localStorage.setItem('examHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save theory exam history:', e);
    }

    setExamDone(true);
    setShowSubmitConfirm(false);
  }, [questions, timeLeft]);

  if (questions.length === 0) {
    return (
      <div className="theory-loading">
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⚙️</div>
        <p>{t('common.loading')}...</p>
      </div>
    );
  }

  if (examDone) {
    return <TheoryResults questions={questions} lang={lang} navigate={navigate} timeSpent={TIME_LIMIT_SECONDS - timeLeft} t={t} />;
  }

  const current = questions[currentIdx];
  const answeredCount = questions.filter(q => q.selectedOption !== null).length;

  const stateColor = (s: AnswerState): string => {
    switch (s) {
      case 'answered': return '#2E86DE';
      case 'skipped':  return '#F5A623';
      case 'flagged':  return '#E63329';
      default:         return '#4A6080';
    }
  };

  const options = lang === 'ka' ? current.question.options_ka : current.question.options_en;
  const questionText = lang === 'ka' ? current.question.question_ka : current.question.question_en;

  return (
    <div className="theory-page">
      {/* Top bar */}
      <header className="theory-header">
        <div className="theory-progress-info">
          <span className="text-secondary text-sm">
            {t('theory.question')} <strong>{currentIdx + 1}</strong> {t('theory.of')} {questions.length}
          </span>
          <div className="theory-progress-bar">
            <div
              className="theory-progress-fill"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-secondary text-sm">{answeredCount}/{questions.length}</span>
        </div>

        <h1 className="theory-title">{t('theory.title')}</h1>

        <div className={`theory-timer ${isUrgent ? 'urgent' : ''}`}>
          <span>⏱</span>
          <span className="timer-digits">{formatTime(timeLeft)}</span>
        </div>
      </header>

      <div className="theory-body">
        {/* Question panel */}
        <main className="theory-question-panel animate-fadeIn" key={currentIdx}>
          {current.question.image && (
            <img
              src={current.question.image}
              alt="Road sign"
              className="question-image"
            />
          )}

          <div className="question-category-badge">
            {t(`theory.categories.${current.question.category}`)}
            {current.question.lawRef && (
              <span className="law-ref">{current.question.lawRef}</span>
            )}
          </div>

          <p className="question-text">{questionText}</p>

          <div className="options-list">
            {options.map((opt, i) => {
              const label = ['A', 'B', 'C', 'D'][i];
              const isSelected = current.selectedOption === i;
              const isCorrect = current.question.correct === i;

              let optionClass = 'option-btn';
              if (isSelected) optionClass += ' selected';

              if (current.revealed) {
                if (isCorrect) {
                  optionClass += ' correct-reveal';
                } else if (isSelected) {
                  optionClass += ' wrong-reveal';
                } else {
                  optionClass += ' disabled-reveal';
                }
              }

              return (
                <button
                  key={i}
                  id={`option-${label}`}
                  className={optionClass}
                  onClick={() => selectOption(i)}
                  disabled={current.revealed}
                >
                  <span className="option-label">{label}</span>
                  <span className="option-text">{opt}</span>
                  {current.revealed && isCorrect && <span className="option-check" style={{ color: '#22C55E' }}>✓</span>}
                  {current.revealed && isSelected && !isCorrect && <span className="option-check" style={{ color: '#EF4444' }}>✗</span>}
                </button>
              );
            })}
          </div>

          {current.revealed && (
            <div className="explanation-panel animate-fadeIn" style={{
              background: 'rgba(100,150,220,0.08)',
              borderLeft: '4px solid #2E86DE',
              padding: '1rem',
              borderRadius: '0 8px 8px 0',
              marginTop: '1rem',
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              <p style={{ fontWeight: 700, color: '#F0F4FF', marginBottom: '0.25rem' }}>
                📌 {t('results.explanation')}:
              </p>
              <p style={{ color: '#8BA4C4' }}>
                {lang === 'ka' ? current.question.explanation_ka : current.question.explanation_en}
                {current.question.lawRef && (
                  <span className="law-ref-inline" style={{ marginLeft: '0.5rem', fontWeight: 700, color: '#60A5FA' }}>
                    ({current.question.lawRef})
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="question-actions">
            <button className="btn btn-ghost btn-sm" onClick={goPrev} disabled={currentIdx === 0} id="btn-prev">
              ← Prev
            </button>
            <button className="btn btn-ghost btn-sm" onClick={toggleFlag} id="btn-flag">
              {current.state === 'flagged' ? '🚩 ' + t('theory.flagged') : '⚑ ' + t('theory.flag')}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={skipQuestion} id="btn-skip">
              {t('theory.skip')}
            </button>
            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-primary btn-sm" onClick={goNext} id="btn-next">
                {current.selectedOption !== null && !current.revealed ? 'Check Answer' : 'Next →'}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmitAction}
                id="btn-submit"
              >
                {current.selectedOption !== null && !current.revealed ? 'Check Answer' : t('theory.submit')}
              </button>
            )}
          </div>
        </main>

        {/* Question navigator sidebar */}
        <aside className="theory-navigator">
          <p className="text-secondary text-xs" style={{ marginBottom: '0.5rem' }}>
            {t('theory.question')}s
          </p>
          <div className="question-grid">
            {questions.map((q, i) => {
              const isRevealed = q.revealed;
              const isCorrect = isRevealed && q.selectedOption === q.question.correct;
              const borderClass = isRevealed ? (isCorrect ? 'correct-border' : 'wrong-border') : '';

              return (
                <button
                  key={i}
                  className={`q-dot ${currentIdx === i ? 'current' : ''} ${borderClass}`}
                  style={{ background: stateColor(q.state) }}
                  onClick={() => goTo(i)}
                  title={`Q${i + 1}: ${q.state}`}
                  id={`qdot-${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="nav-legend">
            <div className="nav-legend-item">
              <span className="nav-dot" style={{ background: '#2E86DE' }} />
              <span className="text-xs text-muted">{t('theory.answered')}</span>
            </div>
            <div className="nav-legend-item">
              <span className="nav-dot" style={{ background: '#F5A623' }} />
              <span className="text-xs text-muted">{t('theory.skip')}</span>
            </div>
            <div className="nav-legend-item">
              <span className="nav-dot" style={{ background: '#E63329' }} />
              <span className="text-xs text-muted">{t('theory.flagged')}</span>
            </div>
            <div className="nav-legend-item">
              <span className="nav-dot" style={{ background: '#4A6080' }} />
              <span className="text-xs text-muted">{t('theory.unanswered')}</span>
            </div>
          </div>

          <button
            className="btn btn-primary w-full"
            style={{ marginTop: 'auto' }}
            onClick={() => setShowSubmitConfirm(true)}
            id="btn-submit-side"
          >
            {t('theory.submit')}
          </button>
        </aside>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-box animate-fadeInScale">
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: 800 }}>
              Submit exam?
            </h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '1.5rem' }}>
              {answeredCount} of {questions.length} questions answered.
              {questions.length - answeredCount > 0 && ` ${questions.length - answeredCount} unanswered.`}
            </p>
            <div className="flex gap-3">
              <button className="btn btn-ghost flex-1" onClick={() => setShowSubmitConfirm(false)} id="confirm-cancel">
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary flex-1" onClick={submitExam} id="confirm-submit">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// RESULTS COMPONENT
// ============================================================
interface ResultsProps {
  questions: QuestionState[];
  lang: string;
  navigate: (path: string) => void;
  timeSpent: number;
  t: (key: string) => string;
}

const TheoryResults: React.FC<ResultsProps> = ({ questions, lang, navigate, timeSpent, t }) => {
  const correct = questions.filter(q => q.selectedOption === q.question.correct).length;
  const total = questions.length;
  const passed = correct >= PASS_SCORE;
  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;

  const wrongAnswers = questions.filter(q => q.selectedOption !== q.question.correct && q.selectedOption !== null);
  const skipped = questions.filter(q => q.selectedOption === null);

  // Category breakdown
  const categories = ['signs', 'rules', 'safety', 'vehicle', 'firstAid', 'ecology', 'legal'];
  const catStats = categories.map(cat => {
    const catQs = questions.filter(q => q.question.category === cat);
    const catCorrect = catQs.filter(q => q.selectedOption === q.question.correct).length;
    return { cat, total: catQs.length, correct: catCorrect };
  }).filter(c => c.total > 0);

  return (
    <div className="results-page">
      <div className="results-bg" />

      <div className="results-container animate-fadeIn">
        {/* Score hero */}
        <div className={`score-hero ${passed ? 'passed' : 'failed'}`}>
          <div className="score-icon">{passed ? '🏆' : '📚'}</div>
          <h1 className="score-value">{correct} / {total}</h1>
          <div className={`score-badge ${passed ? 'badge-green' : 'badge-red'} badge`} style={{ fontSize: '1rem', padding: '0.5rem 1.5rem' }}>
            {passed ? `✅ ${t('results.passed')}` : `❌ ${t('results.failed')}`}
          </div>
          <p className="score-time text-secondary text-sm">
            ⏱ {t('results.timeTaken')}: {minutes}m {seconds}s
          </p>
        </div>

        {/* Category breakdown */}
        <div className="results-card">
          <h2 className="card-section-title">{t('results.breakdown')}</h2>
          <div className="cat-breakdown">
            {catStats.map(cs => (
              <div key={cs.cat} className="cat-row">
                <span className="cat-name text-sm text-secondary">{t(`theory.categories.${cs.cat}`)}</span>
                <div className="cat-bar-wrap">
                  <div
                    className="cat-bar-fill"
                    style={{
                      width: `${(cs.correct / cs.total) * 100}%`,
                      background: cs.correct / cs.total >= 0.8 ? '#22C55E' : cs.correct / cs.total >= 0.5 ? '#F59E0B' : '#EF4444'
                    }}
                  />
                </div>
                <span className="cat-score text-sm">{cs.correct}/{cs.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wrong answers */}
        {wrongAnswers.length > 0 && (
          <div className="results-card">
            <h2 className="card-section-title">
              ❌ {wrongAnswers.length} Wrong Answer{wrongAnswers.length > 1 ? 's' : ''}
            </h2>
            <div className="wrong-list">
              {wrongAnswers.map((qs, i) => {
                const q = qs.question;
                const options = lang === 'ka' ? q.options_ka : q.options_en;
                const qText = lang === 'ka' ? q.question_ka : q.question_en;
                const explanation = lang === 'ka' ? q.explanation_ka : q.explanation_en;
                return (
                  <div key={q.id} className="wrong-item">
                    <div className="wrong-question-num">Q{i + 1}</div>
                    <div className="wrong-content">
                      <p className="wrong-question text-sm">{qText}</p>
                      <div className="wrong-answers">
                        <span className="answer-wrong">
                          ✗ {t('results.yourAnswer')}: {['A','B','C','D'][qs.selectedOption!]}. {options[qs.selectedOption!]}
                        </span>
                        <span className="answer-correct">
                          ✓ {t('results.correctAnswer')}: {['A','B','C','D'][q.correct]}. {options[q.correct]}
                        </span>
                      </div>
                      <p className="wrong-explanation text-sm text-secondary">
                        📌 {t('results.explanation')}: {explanation}
                        {q.lawRef && <span className="law-ref-inline"> ({q.lawRef})</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skipped */}
        {skipped.length > 0 && (
          <div className="results-card skipped-card">
            <p className="text-warning text-sm">
              ⚠ {skipped.length} question{skipped.length > 1 ? 's' : ''} left unanswered (counted as wrong)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="results-actions">
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/')} id="results-home-btn">
            {t('results.backToMenu')}
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => window.location.reload()} id="results-retry-btn">
            {t('results.tryAgain')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TheoryExam;
