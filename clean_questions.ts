import { QUESTIONS } from './src/data/questions';
import fs from 'fs';

const uniqueQuestions = [];
const seenTexts = new Set();

for (const q of QUESTIONS) {
  if (!seenTexts.has(q.text)) {
    seenTexts.add(q.text);
    uniqueQuestions.push({
      ...q,
      id: uniqueQuestions.length + 1
    });
  }
}

const content = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question } from '../types';

export const QUESTIONS: Question[] = ${JSON.stringify(uniqueQuestions, null, 2)};

export const CATEGORIES_WITH_COUNTS = QUESTIONS.reduce((acc, q) => {
  acc[q.category] = (acc[q.category] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

export const CATEGORIES = Object.keys(CATEGORIES_WITH_COUNTS);
`;

fs.writeFileSync('src/data/questions.ts', content);
console.log(`Cleaned! Total unique questions: ${uniqueQuestions.length}`);
