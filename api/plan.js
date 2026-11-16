import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // CORS 설정 (필요한 경우)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { destination, duration, companions, interests } = req.body || {};

  if (!destination) {
    return res.status(400).json({ error: '여행지(destination)는 필수 입력 항목입니다.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
    당신은 전문 여행 플래너 AI입니다. 사용자의 여행 조건에 맞는 맞춤형 여행 일정을 생성해주세요.
    
    [여행 조건]
    - 여행지: ${destination}
    - 기간: ${duration || '미정'}
    - 동행인: ${companions || '미정'}
    - 관심사: ${interests || '미정'}

    [규칙]
    1. 여행과 관계없는 요청(코딩 질문, 일반 상식 등)이 들어오면 반드시 {"error": "여행과 관련된 요청만 처리할 수 있습니다."} 라는 JSON만 반환하세요.
    2. 영업시간이나 입장료, 가격 등은 변동될 수 있으므로 절대 단정하여 적지 마시고, 팁 항목에 "방문 전 공식 홈페이지 확인 권장" 등으로 안내하세요.
    3. 결과는 반드시 아래와 같은 구조의 순수 JSON 형식으로만 반환하세요 (마크다운 백틱 없이 오직 JSON 객체 문자열만 출력):
    {
      "destination": "여행지 이름",
      "duration": "기간",
      "days": [
        {
          "day": 1,
          "title": "일정 대제목",
          "slots": [
            { "time": "오전", "title": "활동 제목", "desc": "상세 설명", "tip": "팁 (요금/영업시간 단정 금지)" },
            { "time": "오후", "title": "활동 제목", "desc": "상세 설명", "tip": "팁" },
            { "time": "저녁", "title": "활동 제목", "desc": "상세 설명", "tip": "팁" }
          ]
        }
      ]
    }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    const planData = JSON.parse(text);

    return res.status(200).json(planData);
  } catch (error) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ error: '일정 생성 중 오류가 발생했습니다.' });
  }
}
