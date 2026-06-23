const fetch = require('node-fetch');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, context } = req.body;
        const apiKey = process.env.FIRE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing FIRE_API_KEY.' });
        }

        // Deconstruct the absolute tracking context passed from the frontend local state
        const {
            profile = {},
            completedResources = [],
            startedResources = [],
            customGoals = [],
            backpackItems = [],
            moodHistory = []
        } = context || {};

        // Build a highly dynamic system prompt mapping every single element of user state
        const systemPrompt = `You are Fireside AI, an empathetic, highly adaptive personalized guide and mentor. 
You possess complete and absolute context regarding the user's profile, history, active progress, and items. 

CURRENT USER PROFILE & DEMOGRAPHICS:
- Name: ${profile.name || 'Explorer'}
- Demographics/Bio: ${profile.bio || 'Not provided'}
- Primary Goals: ${profile.goals || 'General growth'}
- Focused Tracks: ${profile.tracks ? JSON.stringify(profile.tracks) : 'All'}

ACTION PLAN & MILESTONE PROGRESS:
- Active/Started Modules: ${startedResources.length > 0 ? startedResources.join(', ') : 'None yet'}
- Successfully Completed Modules: ${completedResources.length > 0 ? completedResources.join(', ') : 'None yet'}
- Custom User Goals: ${customGoals.length > 0 ? JSON.stringify(customGoals) : 'None configured'}

USER WALLET & BACKPACK INVENTORY:
- Items Collected: ${backpackItems.length > 0 ? JSON.stringify(backpackItems) : 'Empty'}

RECENT MOOD & RECOVERY LOGS:
- Historical Entries: ${moodHistory.length > 0 ? JSON.stringify(moodHistory.slice(-5)) : 'No logs recorded yet'}

INSTRUCTIONS:
1. Always reference or gracefully weave in their active progress, current goals, or backpack inventory when relevant to build continuity.
2. Respond empathetically and adapt your complexity to match their experience level.
3. Keep answers interactive, concise, and structured cleanly using Markdown formatting.`;

        // Assemble messages matching OpenAI-compatible formatting required by NVIDIA NIM
        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({
                // Map the front-end 'ai' role back to standard LLM 'assistant' role
                role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.text || msg.content
            }))
        ];

        // Call the high-powered NVIDIA NIM Cloud inference endpoint
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta/llama-3.3-70b-instruct', // Premium enterprise instruction model hosted on NIM
                messages: formattedMessages,
                max_tokens: 1024,
                temperature: 0.7,
                top_p: 1.0
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('NVIDIA NIM API Error:', errText);
            return res.status(response.status).json({ error: 'Error communicating with AI engine.' });
        }

        const data = await response.json();
        const aiReply = data.choices[0].message.content;

        return res.status(200).json({ reply: aiReply });

    } catch (error) {
        console.error('Server Internal Error:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
}