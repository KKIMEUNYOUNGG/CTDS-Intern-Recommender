const { cleanInputs, runWorkflow, parseJson } = require("./_dify");

const FIELDS = ["desired_role", "employment_type", "location", "education", "experience", "skills",
  "experience_summary", "data_mode", "university", "major", "gpa", "gpa_scale", "language_type",
  "language_score", "cert_count", "award_count", "activity_count"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 지원합니다." });
  const key = process.env.DIFY_KEY_RECOMMEND;
  if (!key) return res.status(500).json({ error: "서버에 추천 앱 키(DIFY_KEY_RECOMMEND)가 설정되지 않았습니다." });
  const inputs = cleanInputs(req.body || {}, FIELDS);
  if (!inputs.desired_role) return res.status(400).json({ error: "희망 직무를 입력해 주세요." });
  try {
    const out = await runWorkflow(key, inputs);
    const data = parseJson(out.result_json);
    // 후보가 없으면 추천 앱이 안내 문구(empty_result)만 돌려준다.
    res.status(200).json(data ? data : { jobs: [], message: out.empty_result || "조건에 맞는 공고가 없습니다." });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
};
