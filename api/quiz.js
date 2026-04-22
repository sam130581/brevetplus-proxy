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

  const prompt = `Génère un QCM sur le sujet : "${topic}" (matière : ${subject}) pour un élève de 3e qui prépare le brevet.
Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks :
{
  "question": "La question, courte et claire (max 20 mots)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": 0,
  "explanation": "Explication simple en 2 phrases max avec un exemple concret"
}
Règles : langage très simple niveau 3e, une seule bonne réponse (answer = index 0-3).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: 'Tu es un assistant pédagogique. Réponds TOUJOURS uniquement en JSON valide, sans aucun markdown, sans backticks, sans texte avant ou après.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const raw = data.content.map(x => x.text || '').join('').trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const quiz = JSON.parse(clean);

    return res.status(200).json(quiz);

  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erreur serveur' });
  }
}
