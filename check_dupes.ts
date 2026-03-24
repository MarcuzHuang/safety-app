import { QUESTIONS } from './src/data/questions';
const texts = QUESTIONS.map(q => q.text);
const uniqueTexts = new Set(texts);
console.log(`Total: ${texts.length}, Unique: ${uniqueTexts.size}`);
const counts = {};
texts.forEach(t => counts[t] = (counts[t] || 0) + 1);
const duplicates = Object.entries(counts).filter(([t, c]) => c > 1);
console.log('Duplicates:', duplicates.slice(0, 10));
