/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation?: string;
}

export interface QuizSettings {
  categories: string[];
  count: number;
}

export type QuizState = 'setup' | 'session' | 'results' | 'browse';

export interface UserAnswer {
  questionId: number;
  selectedOption: number;
  isCorrect: boolean;
}
