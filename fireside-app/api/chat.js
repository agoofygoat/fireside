const fetch = require('node-fetch');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, context } = req.body;
        const apiKey = process.env.FIRE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration failure: Missing FIRE_API_KEY environment binding.' });
        }

        const {
            profile = {},
            completedResources = [],
            startedResources = [],
            customGoals = [],
            backpackItems = []
        } = context || {};

        const systemPrompt = `You are Fireside AI, an empathetic, premium guide and personal mentor.
You possess absolute structural context regarding the user's demographic profile, tracking milestones, progress history, and collected backpack components.

CURRENT USER METRICS:
- Name/Handle: ${profile.name || 'Explorer'}
- Demographics & Narrative Background: ${profile.bio || 'Not filled out yet'}
- Focus Areas: ${profile.tracks ? JSON.stringify(profile.tracks) : 'All General Programs'}
- Underlying Goal Orientation: ${profile.goals || 'General Development'}

TRACK MODULE PROGRESS:
- Active Ongoing Milestones: ${startedResources.length > 0 ? startedResources.join(', ') : 'None currently selected'}
- Finished / Checked Modules: ${completedResources.length > 0 ? completedResources.join(', ') : 'None completed yet'}
- Extra User Directives: ${customGoals.length > 0 ? JSON.stringify(customGoals) : 'No custom directives mapped'}

USER BACKPACK COMPONENT WALLET:
- Available Items / Badges Stack: ${backpackItems.length > 0 ? JSON.stringify(backpackItems) : 'Empty'}

CRITICAL OPERATIONAL INSTRUCTIONS:
1. Maintain continuity by directly incorporating their backpack items or module status into your guidance when appropriate.
2. Provide a supportive, conversational tone.
3. Keep answers concise, highly specific, actionable, and formatted beautifully using Markdown tags.`;

        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({
                role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.text || msg.content
            }))
        ];

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'nvidia/nemotron-3-super-120b-a12b',
                messages: formattedMessages,
                max_tokens: 1024,
                temperature: 0.7,
                top_p: 1.0
            })
        });

        if (!response.ok) {
            const errPayload = await response.text();
            console.error('NVIDIA Infrastructure Rejection Log:', errPayload);
            return res.status(response.status).json({ error: `NIM Route Error Status: ${response.statusText}` });
        }

        const data = await response.json();
        const aiReply = data.choices[0].message.content;

        return res.status(200).json({ reply: aiReply });

    } catch (error) {
        console.error('Server Functional Crash Log:', error);
        return res.status(500).json({ error: 'Internal server proxy failure.' });
    }
}