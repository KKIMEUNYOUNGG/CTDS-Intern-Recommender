// Dify 워크플로를 호출하는 공통 함수. API 키는 서버 환경변수에서만 읽는다.
const BASE = (process.env.DIFY_API_BASE || "https://api.dify.ai/v1").replace(/\/$/, "");

const CHOICES = {
  employment_type: ["전체", "정규직", "인턴", "전환형 인턴"],
  data_mode: ["학습용 과거 공고", "현재 지원 가능한 공고"],
  university: ["선택 안 함", "서울4년", "수도권4년", "지방4년", "대학원", "대졸4년"],
  gpa_scale: ["4.5", "4.3", "4.0"],
  language_type: ["선택 안 함", "OPIc", "TOEIC", "TOEIC Speaking"],
};
const TEXT_LIMITS = {
  desired_role: 200, location: 200, education: 100, experience: 200, skills: 1000,
  experience_summary: 2000, major: 100, language_score: 30, job_title: 200,
};
const NUMBERS = ["gpa", "cert_count", "award_count", "activity_count"];

// 브라우저에서 온 값을 앱 입력 형식에 맞게 걸러 낸다. 모르는 항목은 버린다.
function cleanInputs(body, fields) {
  const inputs = {};
  for (const name of fields) {
    const value = body[name];
    if (name in CHOICES) {
      inputs[name] = CHOICES[name].includes(value) ? value : CHOICES[name][0];
    } else if (NUMBERS.includes(name)) {
      const number = Number(value);
      if (value !== "" && value != null && Number.isFinite(number) && number >= 0) inputs[name] = number;
    } else {
      inputs[name] = String(value ?? "").trim().slice(0, TEXT_LIMITS[name] ?? 200);
    }
  }
  return inputs;
}

async function runWorkflow(key, inputs) {
  const res = await fetch(`${BASE}/workflows/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inputs, response_mode: "blocking", user: "pickme-web" }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Dify 호출 실패 (${res.status})`);
  if (body.data?.status !== "succeeded") throw new Error(body.data?.error || "워크플로 실행에 실패했습니다.");
  return body.data.outputs || {};
}

function parseJson(text) {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

module.exports = { cleanInputs, runWorkflow, parseJson };
