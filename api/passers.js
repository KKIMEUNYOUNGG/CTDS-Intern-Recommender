const { cleanInputs, runWorkflow, parseJson } = require("./_dify");

const FIELDS = ["job_title", "university", "major", "gpa", "gpa_scale", "language_type", "language_score",
  "cert_count", "award_count", "activity_count"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 지원합니다." });
  const key = process.env.DIFY_KEY_PASSERS;
  if (!key) return res.status(500).json({ error: "서버에 합격자 앱 키(DIFY_KEY_PASSERS)가 설정되지 않았습니다." });
  const body = req.body || {};
  const recruitmentId = String(body.recruitment_id || "").trim();
  if (!/^\d{4,12}$/.test(recruitmentId)) return res.status(400).json({ error: "공고번호는 숫자만 입력해 주세요." });
  const inputs = { recruitment_id: recruitmentId, data_origin: "전체", ...cleanInputs(body, FIELDS) };
  try {
    const out = await runWorkflow(key, inputs);
    // 합격자 자료가 있으면 result_json, 없으면 종료 노드가 달라 이름이 다르므로 *_json 중 있는 것을 쓴다.
    const jsonKey = Object.keys(out).find((name) => name.endsWith("json") && out[name]);
    const textKey = Object.keys(out).find((name) => !name.endsWith("json") && typeof out[name] === "string" && out[name]);
    res.status(200).json({ data: jsonKey ? parseJson(out[jsonKey]) : null, markdown: textKey ? out[textKey] : "" });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
};
