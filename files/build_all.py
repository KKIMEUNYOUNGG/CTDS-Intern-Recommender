"""start_posts_1.csv(106개 공고) 기준으로 가상 합격자 3종 테이블의 뼈대를 CSV/JSON으로 만든다.
채움: 개인/기업/공고 식별자, 기업명(company_label), 공고명(title), 합격 시기, 합격 전형, 합격 직무, is_synthetic
비움: 스펙·자소서·면접 내용 컬럼 (직접 작성)"""
import json, random
import pandas as pd

random.seed(42)
SRC = "/mnt/user-data/uploads/"
OUT = "/mnt/user-data/outputs/final/"

sp = pd.read_csv(SRC + "start_posts_1.csv", encoding="cp949")
jp = pd.read_csv(SRC + "채용정보_확인값.csv", encoding="utf-8-sig")
role_map = dict(zip(jp.source_job_id, jp.role))

def hire_period(d):
    d = pd.to_datetime(d)
    return f"{d.year} {'상반기' if d.month <= 6 else '하반기'}"

def stage_type(r):
    title, emp, car = str(r["title"]), str(r["employment_type"]), str(r["career_type"])
    if "인턴" in title or emp.strip().startswith("인턴"):
        return "인턴"
    if ("경력" in title and "신입" not in title) or (car.startswith("경력") and "신입" not in car):
        return "경력"
    return "신입 공채"

def pick_role(job_id, fallback):
    role = role_map.get(job_id)
    if pd.isna(role):
        role = fallback
    if pd.isna(role):
        return None
    parts = [p.strip() for p in str(role).split(",") if p.strip()]
    return random.choice(parts) if parts else None

base = []
for i, r in enumerate(sp.itertuples(index=False), 1):
    row = r._asdict()
    base.append(dict(
        candidate_id=f"C{i:04d}",
        company_id=row["source_company_id"],
        company_label=row["company_label"],
        source_job_id=int(row["source_job_id"]),
        title=row["title"],
        hire_period=hire_period(row["calendar_start_date"]),
        stage_type=stage_type(row),
        job_title=pick_role(row["source_job_id"], row["recruitment_field"]),
    ))
base = pd.DataFrame(base)
base["is_synthetic"] = 1
common = ["company_id", "company_label", "source_job_id", "title", "hire_period", "stage_type", "job_title"]

def nn(v):  # NaN -> None (JSON null)
    return None if pd.isna(v) else v

# 1) 합격자 스펙
spec_cols = ["candidate_id"] + common + ["university", "major", "gpa", "gpa_scale",
             "language_scores", "certificates", "awards", "activities", "is_synthetic"]
spec = base.reindex(columns=spec_cols)
spec.to_csv(OUT + "passed_spec.csv", index=False, encoding="utf-8-sig")
json.dump([{k: nn(v) for k, v in r.items()} for r in spec.to_dict("records")],
          open(OUT + "passed_spec.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2, default=int)

# 2) 합격자소서 (헤더 + 문항)
eh = base.copy()
eh["essay_id"] = [f"E{i:04d}" for i in range(1, len(eh) + 1)]
essay_cols = ["essay_id", "candidate_id"] + common + ["review_title", "expert_review", "source_url", "is_synthetic"]
essay = eh.reindex(columns=essay_cols)
essay.to_csv(OUT + "passed_essay.csv", index=False, encoding="utf-8-sig")
ea = pd.DataFrame({"answer_id": [f"EA{i:04d}" for i in range(1, len(eh) + 1)],
                   "essay_id": eh["essay_id"], "question_no": 1, "question": None, "answer": None})
ea.to_csv(OUT + "essay_answer.csv", index=False, encoding="utf-8-sig")
ej = []
for r in essay.to_dict("records"):
    r = {k: nn(v) for k, v in r.items()}
    r["answers"] = [{"question_no": 1, "question": None, "answer": None}]
    ej.append(r)
json.dump(ej, open(OUT + "passed_essay.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2, default=int)

# 3) 최종합격 후기 (헤더 + Q&A)
rv = base.copy()
rv["review_id"] = [f"R{i:04d}" for i in range(1, len(rv) + 1)]
rv_cols = ["review_id", "candidate_id"] + common + ["round_type", "interview_format", "difficulty",
          "review_text", "qa_count", "is_synthetic"]
rv["qa_count"] = 1
review = rv.reindex(columns=rv_cols)
review.to_csv(OUT + "interview_review.csv", index=False, encoding="utf-8-sig")
qa = pd.DataFrame({"qa_id": [f"Q{i:04d}" for i in range(1, len(rv) + 1)],
                   "review_id": rv["review_id"], "question_no": 1, "question": None,
                   "answer": None, "question_type": None})
qa.to_csv(OUT + "interview_qa.csv", index=False, encoding="utf-8-sig")
rj = []
for r in review.to_dict("records"):
    r = {k: nn(v) for k, v in r.items()}
    r["qa"] = [{"question_no": 1, "question": None, "answer": None, "question_type": None}]
    rj.append(r)
json.dump(rj, open(OUT + "interview_review.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2, default=int)
print(len(sp), "공고 /", len(base), "합격자")
