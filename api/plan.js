/**
 * Vercel Serverless Function: /api/plan
 * ES Module ("type": "module" in package.json)
 * Uses Gemini 3.8 Flash model to generate personalized travel itineraries.
 */

export default async function handler(req, res) {
    // CORS headers setup
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
    }

    try {
        const { destination, days, companion, interests, transportation } = req.body;

        if (!destination) {
            return res.status(400).json({ error: '여행지를 입력해주세요.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' });
        }

        const durationDays = parseInt(days) || 3;
        const companionType = companion || '친구';
        const interestList = Array.isArray(interests) ? interests.join(', ') : '자유 관광';
        const transportMode = transportation || '대중교통';

        // Prompt with safety guidelines, anti-irrelevant request logic, and non-absolute pricing/hours constraint
        const systemPrompt = `
당신은 전문 AI 여행 플래너입니다. 사용자가 제공한 여행 정보를 바탕으로 맞춤형 일정을 JSON 형식으로 생성해야 합니다.

[중요 제약사항]
1. 여행이나 관광, 도시 탐방과 전혀 관계없는 요청(예: 코딩, 수학 계산, 역사적 사실 설명, 소설 작성 등)이 들어오면 여행과 무관한 요청임을 인지하고, 이에 따르지 말고 거부 메시지를 담은 기본 JSON 구조를 반환하거나 여행 관련 내용으로 유도하세요.
2. 특정 장소의 영업시간이나 입장료, 가격 정보는 실시간으로 변동되므로 절대 단정하거나 확정된 수치로 기재하지 마세요. 대신 "현장 상황 및 시즌에 따라 변동될 수 있으므로 방문 전 공식 채널 확인 권장"이라는 뉘앙스를 반영하거나 대략적인 시간대 위주로 구성하세요.
3. 응답은 반드시 마크다운 없이 순수 JSON 객체(Parse 가능한 형태)로만 출력하세요.

[입력 정보]
- 여행지: ${destination}
- 기간: ${durationDays}박 ${durationDays + 1}일
- 동행자: ${companionType}
- 관심사: ${interestList}
- 이동 수단: ${transportMode}

[필수 JSON 출력 스키마]
{
  "destination": "${destination}",
  "duration": "${durationDays}박 ${durationDays + 1}일",
  "companion": "${companionType}",
  "interests": ${JSON.stringify(interests || [])},
  "transportation": "${transportMode}",
  "days": [
    {
      "dayNumber": 1,
      "title": "Day 1: 첫째 날 제목",
      "activities": [
        {
          "time": "10:00",
          "title": "활동 이름",
          "desc": "활동 상세 설명 (영업시간/요금 단정 금지)",
          "icon": "fa-plane-arrival",
          "tag": "이동"
        }
      ]
    }
  ]
}
`;

        // Call Gemini 3.8 Flash API
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: systemPrompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API 오류 발생: ${geminiResponse.status} - ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('Gemini로부터 유효한 응답을 받지 못했습니다.');
        }

        const itineraryData = JSON.parse(responseText);

        return res.status(200).json(itineraryData);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: '일정 생성 중 오류가 발생했습니다.', 
            details: error.message 
        });
    }
}
