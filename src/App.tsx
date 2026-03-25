/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, 
  Settings, 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  BookOpen,
  LayoutGrid,
  Clock,
  Eye,
  ArrowLeft,
  Sparkles,
  Send,
  Loader2
} from 'lucide-react';
import { Question, QuizSettings, QuizState, UserAnswer } from './types';
import { QUESTIONS, CATEGORIES, CATEGORIES_WITH_COUNTS } from './data/questions';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [state, setState] = useState<QuizState>('setup');
  const [settings, setSettings] = useState<QuizSettings>({
    categories: [],
    count: 20
  });
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [browseCategory, setBrowseCategory] = useState<string | null>(null);
  const [mistakeBank, setMistakeBank] = useState<Record<number, number>>({});
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 從 localStorage 載入錯題本
  useEffect(() => {
    const saved = localStorage.getItem('mistakeBank');
    if (saved) {
      try {
        setMistakeBank(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load mistake bank', e);
      }
    }
  }, []);

  // 儲存錯題本到 localStorage
  useEffect(() => {
    localStorage.setItem('mistakeBank', JSON.stringify(mistakeBank));
  }, [mistakeBank]);

  // 初始化測驗
  const startQuiz = () => {
    const filtered = QUESTIONS.filter(q => settings.categories.includes(q.category));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(settings.count, shuffled.length));
    
    setCurrentQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers([]);
    setShowExplanation(false);
    setStartTime(Date.now());
    setState('session');
  };

  // 處理答案選擇
  const handleAnswer = (optionIndex: number) => {
    if (userAnswers[currentIndex]) return; // 已作答則不處理

    const question = currentQuestions[currentIndex];
    const isCorrect = optionIndex === question.correctAnswer;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = {
      questionId: question.id,
      selectedOption: optionIndex,
      isCorrect
    };
    setUserAnswers(newAnswers);
    setShowExplanation(true);

    // 如果答錯，加入錯題本
    if (!isCorrect) {
      setMistakeBank(prev => ({
        ...prev,
        [question.id]: (prev[question.id] || 0) + 1
      }));
    }
  };

  // 下一題
  const nextQuestion = () => {
    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowExplanation(false);
    } else {
      setEndTime(Date.now());
      setState('results');
    }
  };

  // 重新開始
  const resetQuiz = () => {
    setState('setup');
    setBrowseCategory(null);
  };

  const startBrowse = (cat: string) => {
    setBrowseCategory(cat);
    setState('browse');
  };

  // 針對錯題重新測驗
  const startWrongQuestionsQuiz = () => {
    const wrongQuestions = currentQuestions.filter((_, idx) => !userAnswers[idx]?.isCorrect);
    if (wrongQuestions.length === 0) return;

    setCurrentQuestions(wrongQuestions);
    setCurrentIndex(0);
    setUserAnswers([]);
    setShowExplanation(false);
    setStartTime(Date.now());
    setState('session');
  };

  // 從錯題本開始測驗
  const startMistakeBankQuiz = () => {
    const mistakeIds = Object.keys(mistakeBank).map(Number);
    if (mistakeIds.length === 0) return;

    const filtered = QUESTIONS.filter(q => mistakeIds.includes(q.id));
    // 優先選擇錯誤次數較多的題目
    const sorted = [...filtered].sort((a, b) => (mistakeBank[b.id] || 0) - (mistakeBank[a.id] || 0));
    const selected = sorted.slice(0, Math.min(settings.count, sorted.length));

    setCurrentQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers([]);
    setShowExplanation(false);
    setStartTime(Date.now());
    setState('session');
  };

  const askAi = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      // 準備背景資訊
      const categoryInfo = Object.entries(CATEGORIES_WITH_COUNTS)
        .map(([name, count]) => `- ${name}: ${count} 題`)
        .join('\n');
      
      const systemInstruction = `你是一位專業的職業安全衛生（OSH）專家。
目前使用者正在使用一個包含 1011 題職安衛題庫的練習 App。
題庫分類包含：
${categoryInfo}

你的任務是根據使用者的問題，提供題庫內容的摘要、重點整理或解答相關知識。
如果使用者詢問特定法規或安全知識，請以專業且易懂的方式回答。
請盡量連結到職安衛的實際應用場景。`;

      const response = await ai.models.generateContent({
        model,
        contents: aiInput,
        config: {
          systemInstruction,
        }
      });

      setAiResponse(response.text || '抱歉，我無法生成回應。');
    } catch (error) {
      console.error('AI Error:', error);
      setAiResponse('呼叫 AI 時發生錯誤，請稍後再試。');
    } finally {
      setIsAiLoading(false);
    }
  };

  const clearMistakeBank = () => {
    if (window.confirm('確定要清除所有錯題紀錄嗎？')) {
      setMistakeBank({});
      localStorage.removeItem('mistakeBank');
    }
  };

  // 計算分數
  const score = useMemo(() => {
    return userAnswers.filter(a => a?.isCorrect).length;
  }, [userAnswers]);

  const duration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return Math.floor((endTime - startTime) / 1000);
  }, [startTime, endTime]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-blue-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight">職安衛題庫大師</h1>
          </div>
          {state === 'session' && (
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-500 hidden sm:block">
                進度: {currentIndex + 1} / {currentQuestions.length}
              </div>
              <button
                onClick={resetQuiz}
                className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                <ArrowLeft className="w-4 h-4" />
                結束測驗
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {state === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold">選擇受測群組 (可複選)</h2>
                  </div>
                  {Object.keys(mistakeBank).length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={startMistakeBankQuiz}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all border border-red-100"
                      >
                        <XCircle className="w-4 h-4" />
                        我的錯題本 ({Object.keys(mistakeBank).length})
                      </button>
                      <button
                        onClick={clearMistakeBank}
                        title="清除錯題本"
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => (
                    <div
                      key={cat}
                      className={`p-4 rounded-2xl text-left transition-all border-2 flex flex-col gap-3 ${
                        settings.categories.includes(cat)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => {
                            setSettings(prev => ({
                              ...prev,
                              categories: prev.categories.includes(cat)
                                ? prev.categories.filter(c => c !== cat)
                                : [...prev.categories, cat]
                            }));
                          }}
                          className="font-medium flex-1 text-left"
                        >
                          {cat}
                        </button>
                        <div className={`text-xs px-2 py-1 rounded-lg ${
                          settings.categories.includes(cat) ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {CATEGORIES_WITH_COUNTS[cat]} 題
                        </div>
                      </div>
                      <button
                        onClick={() => startBrowse(cat)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-1"
                      >
                        <Eye className="w-4 h-4" />
                        瀏覽所有題目
                      </button>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold">選擇考題數量</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[20, 30, 50, 80, 100].map(num => (
                    <button
                      key={num}
                      onClick={() => setSettings(prev => ({ ...prev, count: num }))}
                      className={`px-6 py-3 rounded-full font-medium transition-all border-2 ${
                        settings.count === num
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                      }`}
                    >
                      {num} 題
                    </button>
                  ))}
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, count: 9999 }))}
                    className={`px-6 py-3 rounded-full font-medium transition-all border-2 ${
                      settings.count === 9999
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                    }`}
                  >
                    全部 {settings.categories.length > 0 && `(${settings.categories.reduce((sum, cat) => sum + CATEGORIES_WITH_COUNTS[cat], 0)} 題)`}
                  </button>
                </div>
              </section>

              <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-bold">AI 智慧助手</h2>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">您可以詢問關於題庫的重點摘要、特定分類的知識點，或任何職安衛相關問題。</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && askAi()}
                      placeholder="例如：摘要一下「人因工程」的考點..."
                      className="w-full pl-5 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-200 focus:bg-white transition-all outline-none"
                    />
                    <button
                      onClick={askAi}
                      disabled={isAiLoading || !aiInput.trim()}
                      className="absolute right-2 top-2 p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all disabled:opacity-30"
                    >
                      {isAiLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    </button>
                  </div>
                  
                  {aiResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-purple-50 rounded-2xl p-6 border border-purple-100"
                    >
                      <div className="prose prose-sm max-w-none text-purple-900 whitespace-pre-wrap leading-relaxed">
                        {aiResponse}
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

              <button
                disabled={settings.categories.length === 0}
                onClick={startQuiz}
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5 fill-current" />
                開始測驗
              </button>
            </motion.div>
          )}

          {state === 'session' && currentQuestions[currentIndex] && (
            <motion.div 
              key="session"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    {currentQuestions[currentIndex].category}
                  </span>
                </div>
                <h3 className="text-xl font-bold leading-relaxed mb-8">
                  {currentQuestions[currentIndex].text}
                </h3>

                <div className="space-y-3">
                  {currentQuestions[currentIndex].options.map((option, idx) => {
                    const isSelected = userAnswers[currentIndex]?.selectedOption === idx;
                    const isCorrect = currentQuestions[currentIndex].correctAnswer === idx;
                    const hasAnswered = !!userAnswers[currentIndex];

                    let buttonClass = "w-full p-5 rounded-2xl text-left border-2 transition-all flex items-center justify-between ";
                    if (!hasAnswered) {
                      buttonClass += "border-gray-100 hover:border-blue-200 hover:bg-blue-50";
                    } else {
                      if (isCorrect) {
                        buttonClass += "border-green-500 bg-green-50 text-green-700";
                      } else if (isSelected) {
                        buttonClass += "border-red-500 bg-red-50 text-red-700";
                      } else {
                        buttonClass += "border-gray-100 opacity-50";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={hasAnswered}
                        onClick={() => handleAnswer(idx)}
                        className={buttonClass}
                      >
                        <span className="font-medium">{idx + 1}. {option}</span>
                        {hasAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                        {hasAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {showExplanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 rounded-3xl p-8 border border-blue-100"
                >
                  <div className="flex items-center gap-2 mb-2 text-blue-700">
                    <BookOpen className="w-5 h-5" />
                    <span className="font-bold">解析</span>
                  </div>
                  <p className="text-blue-900 leading-relaxed">
                    {currentQuestions[currentIndex].explanation || "暫無詳細解析。"}
                  </p>
                  
                  <button
                    onClick={nextQuestion}
                    className="mt-6 w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    {currentIndex === currentQuestions.length - 1 ? '查看結果' : '下一題'}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {state === 'browse' && browseCategory && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={resetQuiz}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  <ArrowLeft className="w-5 h-5" />
                  返回設定
                </button>
                <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
                  {browseCategory} ({QUESTIONS.filter(q => q.category === browseCategory).length} 題)
                </div>
              </div>

              <div className="space-y-4">
                {QUESTIONS.filter(q => q.category === browseCategory).map((q, index) => (
                  <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">
                        {index + 1}
                      </div>
                      <div className="space-y-4 flex-1">
                        <h4 className="font-bold text-lg leading-relaxed">{q.text}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => (
                            <div 
                              key={optIdx}
                              className={`p-3 rounded-xl text-sm border ${
                                optIdx === q.correctAnswer 
                                  ? 'bg-green-50 border-green-200 text-green-700 font-medium' 
                                  : 'bg-gray-50 border-gray-100 text-gray-600'
                              }`}
                            >
                              {optIdx + 1}. {opt}
                              {optIdx === q.correctAnswer && " (正確答案)"}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 border border-blue-100">
                            <div className="font-bold mb-1 flex items-center gap-1">
                              <BookOpen className="w-4 h-4" /> 解析
                            </div>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={resetQuiz}
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                返回設定
              </button>
            </motion.div>
          )}

          {state === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8"
            >
              <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100">
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-12 h-12 text-yellow-600" />
                </div>
                <h2 className="text-3xl font-bold mb-2">測驗完成！</h2>
                <p className="text-gray-500 mb-8">您已完成本次練習，表現如下：</p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <div className="text-sm text-gray-500 mb-1">得分</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.round((score / currentQuestions.length) * 100)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <div className="text-sm text-gray-500 mb-1">答對題數</div>
                    <div className="text-3xl font-bold text-green-600">
                      {score} / {currentQuestions.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl col-span-2 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>耗時: {Math.floor(duration / 60)}分 {duration % 60}秒</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={resetQuiz}
                    className="flex-1 py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    返回設定
                  </button>
                  {score < currentQuestions.length && (
                    <button
                      onClick={startWrongQuestionsQuiz}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      針對錯題重新測驗
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        <p>© 2026 職安衛題庫大師 v1.0.0 - 助力您的專業成長</p>
      </footer>
    </div>
  );
}
