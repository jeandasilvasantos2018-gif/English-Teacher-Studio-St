import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for AI Lesson Assistant
  app.post('/api/lesson-ideas', async (req, res) => {
    try {
      const { studentName, englishLevel, targetGoal, classNumber, customFocus } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          plan: `📚 LESSON PLAN FOR ${studentName?.toUpperCase() || 'STUDENT'} — CLASS #${classNumber || 1}
Level: ${englishLevel || 'B1'}
Focus: ${customFocus || 'Conversational Fluency'}

1. WARM-UP (10 mins)
• "What was your biggest success this week?"

2. VOCABULARY & PHRASES (${englishLevel || 'B1'})
• 1. "To outline" - to give a summary.
• 2. "As far as I'm concerned..." - sharing structured thoughts.

3. GRAMMAR FOCUS
• ${customFocus || 'Past Tenses vs Present Perfect'}
• 3 practice sentences.

4. DISCUSSION & ROLEPLAY
• Practice discussing ${targetGoal || 'daily tasks'} in English.

5. HOMEWORK
• Prepare 3 sentences using today's target phrases.`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert English as a Second Language (ESL) teacher.
Generate a concise, practical 45-60 minute lesson plan for a student named "${studentName || 'Student'}" with English CEFR level "${englishLevel || 'B1'}".
Student Goal: "${targetGoal || 'General Fluency'}"
Current Session: Class #${classNumber || 1}
Lesson Focus: "${customFocus || 'Grammar & Spoken Fluency'}"

Include:
1. WARM-UP QUESTION (5 mins)
2. 3 TARGET VOCABULARY WORDS & IDIOMS with clear definitions suitable for level ${englishLevel || 'B1'}
3. GRAMMAR POINT & QUICK PRACTICE EXERCISE
4. CONVERSATION / ROLEPLAY SCENARIO
5. HOMEWORK TASK`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      return res.json({ plan: text });
    } catch (err: any) {
      console.error('Gemini lesson generation error:', err);
      return res.status(500).json({ error: 'Failed to generate lesson plan' });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
