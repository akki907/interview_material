import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import { evaluateHeuristic } from './src/ai/evaluate';

function interviewAiPlugin(env: Record<string, string>): Plugin {
    return {
        name: 'interview-ai-evaluator',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.method === 'POST' && req.url === '/api/evaluate') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', async () => {
                        try {
                            const { question, answer, topic } = JSON.parse(body || '{}');
                            const apiKey = env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_API_KEY || env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

                            let result;
                            if (apiKey && apiKey !== 'your_key_here') {
                                try {
                                    const prompt = `You are a Senior Engineering Director conducting a technical interview on ${topic}.
Question: ${question}
Candidate Answer: ${answer}

Evaluate the candidate on this 4-category rubric (each 0-25):
1. Technical Accuracy & Depth (max 25)
2. Edge Cases & Reliability (max 25)
3. Complexity & Trade-offs (max 25)
4. Communication & Structure (max 25)

Return a JSON object in this exact format:
{
  "score": number,
  "verdict": "Strong Hire" | "Hire" | "Lean Hire" | "Lean No Hire" | "No Hire",
  "summary": string,
  "breakdown": {
    "technicalCorrectness": { "score": number, "max": 25, "feedback": string },
    "edgeCases": { "score": number, "max": 25, "feedback": string },
    "complexityAnalysis": { "score": number, "max": 25, "feedback": string },
    "communication": { "score": number, "max": 25, "feedback": string }
  },
  "strengths": string[],
  "improvements": string[],
  "modelAnswer": string
}`;
                                    const gatewayUrl = env.AI_GATEWAY_URL || 'https://api.openai.com/v1/chat/completions';
                                    const apiRes = await fetch(gatewayUrl, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${apiKey}`,
                                        },
                                        body: JSON.stringify({
                                            model: env.AI_MODEL || 'gpt-4o-mini',
                                            messages: [
                                                { role: 'system', content: 'You are an expert technical interviewer evaluating senior engineers. Respond only in valid JSON.' },
                                                { role: 'user', content: prompt },
                                            ],
                                            temperature: 0.2,
                                        }),
                                    });

                                    if (apiRes.ok) {
                                        const json = await apiRes.json();
                                        const rawContent = json.choices?.[0]?.message?.content || '{}';
                                        const cleaned = rawContent.replace(/```json\n?|```/g, '').trim();
                                        const parsed = JSON.parse(cleaned);
                                        result = { ...parsed, isLiveAI: true, provider: 'AI Gateway (Live)' };
                                    }
                                } catch {
                                    // Fallback to heuristic evaluator on network/API failure
                                }
                            }

                            if (!result) {
                                result = evaluateHeuristic(question || '', answer || '', topic || 'General');
                            }

                            res.setHeader('Content-Type', 'application/json');
                            res.statusCode = 200;
                            res.end(JSON.stringify(result));
                        } catch {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: 'Invalid request body' }));
                        }
                    });
                    return;
                }
                next();
            });
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        root: '.',
        envDir: '.',
        plugins: [interviewAiPlugin(env)],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components.ts'),
                '@utils': path.resolve(__dirname, './src/utils.ts'),
                '@store': path.resolve(__dirname, './src/store.ts'),
                '@data': path.resolve(__dirname, './src/data.ts'),
                '@nav': path.resolve(__dirname, './src/nav.ts'),
                '@renderers': path.resolve(__dirname, './src/renderers'),
            },
        },
        server: {
            port: 5173,
        },
        build: {
            outDir: 'dist',
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    manualChunks: {
                        'vendor': ['ai'],
                    },
                },
            },
        },
        css: {
            postcss: {},
        },
    };
});
