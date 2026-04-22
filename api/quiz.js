export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, subject } = req.body;

  if (!topic || !subject) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  const prompt = `Tu es un prof de collège qui prépare un élève de 3e au brevet.
Génère un QCM sur le sujet : "${topic}" (matière : ${subject}).
Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks :
{
  "question": "La question, courte et claire (max 20 mots)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": 0,
  "explanation": "Explication simple en 2 phrases max avec un exemple concret"
}
Règles : langage très simple niveau 3e, une seule bonne réponse (answer = index 0-3).`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        temperature: 0.8,
        messages: [
          { role: 'system', content: 'Tu es un assistant pédagogique. Réponds TOUJOURS uniquement en JSON valide, sans aucun markdown.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const raw = data.choices[0].message.content.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const quiz = JSON.parse(clean);

    return res.status(200).json(quiz);

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
