/**
 * Vercel Serverless Function: /api/plan
 * Generates AI-powered travel itineraries using Gemini 3.8 Flash model.
 */

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { destination, duration, companion, interests } = req.body;

  if (!destination) {
    return res.status(400).json({ error: '여행지가 입력되지 않았습니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' });
  }

  try {
    const prompt = `당신은 전문 AI 여행 플래너입니다. 사용자의 요청에 따라 최적의 맞춤 여행 일정을 JSON 형식으로 생성해주세요.

[입력 정보]
- 여행지: ${destination}
- 기간: ${duration}
- 동행자: ${companion}
- 관심사: ${Array.isArray(interests) ? interests.join(', ') : interests}

[핵심 규칙]
1. 안전 및 가이드라인: 만약 여행과 전혀 관계없는 요청이나 부적절한 입력이 들어오면 {"error": "여행과 관련된 유효한 내용만 입력해주세요."} 형태의 JSON만 반환하세요.
2. 정보 정확성: 영업시간, 입장료, 가격 등은 시기에 따라 수시로 변동되므로 단정적인 수치나 확정된 요금을 적지 마시고, 팁 항목에 "방문 전 공식 채널 확인 권장" 등의 표현을 포함해주세요.
3. 응답 포맷: 마크다운 코드블록(\`\`\` 등)을 절대 사용하지 말고, 파싱 가능한 순수 JSON 문자열만 출력하세요.
4. JSON 구조 예시:
{
  "destination": "${destination}",
  "duration": "${duration}",
  "companion": "${companion}",
  "interests": "#맛집탐방 #힐링",
  "days": [
    {
      "day": 1,
      "title": "설레는 첫째 날",
      "spots": [
        {
          "time": "10:00 AM",
          "title": "추천 장소 이름",
          "category": "관광/랜드마크",
          "description": "장소에 대한 간략한 설명",
          "tip": "운영시간 및 요금은 변동될 수 있으니 방문 전 확인이 필요해요."
        }
      ]
    }
  ]
}`;

    // Call Gemini 3.8 Flash model via REST API
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API 통신 실패: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('Gemini로부터 유효한 응답을 받지 못했습니다.');
    }

    // Clean up potential markdown formatting if model accidentally included it
    const cleanJsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const planJson = JSON.parse(cleanJsonStr);

    return res.status(200).json(planJson);

  } catch (error) {
    console.error('Plan API Error:', error);
    return res.status(500).json({ 
      error: '일정 생성 중 오류가 발생했습니다.', 
      details: error.message 
    });
  }
}
