"""passed_spec.csv에서 합격자 스펙이 비어 있는 행(is_ai가 비어 있는 행)만 가상 데이터로 채우고 is_ai=1로 표시한다.
직접 입력한 행(is_ai=0)은 수정하지 않는다. 분포는 직접 입력한 48행의 분포를 참고했다."""
import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
SRC = "/mnt/user-data/uploads/passed_spec.csv"
OUT = "/mnt/user-data/outputs/spec/passed_spec.csv"

d = pd.read_csv(SRC, encoding="cp949")
empty = d["is_ai"].isna()

def pick(options, weights):
    w = np.array(weights, dtype=float)
    return options[rng.choice(len(options), p=w / w.sum())]

def stage(title):
    t = str(title)
    if "인턴" in t and not any(k in t for k in ["경력", "신입사원", "신입ㆍ"]):
        return "인턴"
    if ("경력사원" in t or "경력직" in t) and "신입" not in t:
        return "경력"
    return "신입"

JOBS = ["소프트웨어개발자", "앱개발자", "AI/ML엔지니어", "웹개발자", "네트워크엔지니어", "백엔드개발자", "시스템엔지니어"]
JOB_W = [15, 11, 8, 7, 5, 4, 3]

def job(title):
    t = str(title)
    if any(k in t for k in ["보안", "클라우드", "관제", "CERT"]):
        return pick(["시스템엔지니어", "네트워크엔지니어"], [1, 1])
    if "AI" in t and "개발" in t:
        return pick(["AI/ML엔지니어", "소프트웨어개발자"], [1, 1])
    if "AI" in t:
        return "AI/ML엔지니어"
    return pick(JOBS, JOB_W)

MAJORS = {"컴퓨터공학과": 15, "산업공학전공": 5, "전자공학과": 4, "경영학과_경영전공": 4, "소프트웨어공학과": 4,
          "정보통신공학": 2, "전자정보공학과": 2, "정보통신학부": 2, "화학공학/고분자공학과": 1, "응용통계학과": 1,
          "영어영문학": 1, "정보통계학과": 1, "컴퓨터소프트웨어공학과": 1, "컴퓨터교육과": 1,
          "컴퓨터정보통신공학과": 1, "정보통신전자공학과": 1, "산업경영공학과": 1, "전자IT미디어공학과": 1}
UNIV = ["서울4년", "수도권4년", "지방4년", "대학원"]
UNIV_W = [43, 22, 22, 13]

def lang():
    if rng.random() > 0.85:
        return np.nan, np.nan
    t = pick(["OPIc", "TOEIC Speaking", "TOEIC"], [30, 6, 5])
    if t == "OPIc":
        return t, pick(["IM1", "IH", "IL", "IM2", "AL"], [13, 11, 3, 2, 1])
    if t == "TOEIC Speaking":
        return t, pick(["Level5", "Level6", "Level7"], [2, 5, 2])
    return t, str(int(np.clip(round(rng.normal(850, 70) / 5) * 5, 700, 990)))

def count(p_has, values, weights):
    return pick(values, weights) if rng.random() < p_has else np.nan

for i in d.index[empty]:
    title = d.at[i, "title"]
    st = stage(title)
    if "석/박사" in str(title):
        univ = "대학원"
    elif st == "인턴":
        univ = pick(UNIV[:3], UNIV_W[:3])   # 인턴 공고는 대학원 제외
    else:
        univ = pick(UNIV, UNIV_W)
    gpa = np.clip(rng.normal(4.25, 0.1) if univ == "대학원" else rng.normal(3.85, 0.3), 3.0, 4.4)
    lt, ls = lang()
    d.at[i, "hire_year"] = pick(list(range(2015, 2024)), [2, 5, 5, 5, 6, 5, 5, 10, 9])
    d.at[i, "hire_month"] = pick(["상반기", "하반기"], [18, 30])
    d.at[i, "stage_type"] = st
    d.at[i, "job_title"] = job(title)
    d.at[i, "university"] = univ
    d.at[i, "major"] = pick(list(MAJORS), list(MAJORS.values()))
    d.at[i, "gpa"] = round(float(gpa), 2)
    d.at[i, "gpa_scale"] = 4.5
    d.at[i, "language_type"] = lt
    d.at[i, "language_scores"] = ls
    d.at[i, "certificates"] = count(0.75, [1, 2, 3, 4, 5], [11, 13, 8, 3, 1])
    d.at[i, "awards"] = count(0.50, [1, 2, 3], [13, 4, 7])
    d.at[i, "activities"] = count(0.83, [1, 2, 3, 4, 6], [13, 13, 8, 1, 5])
    d.at[i, "is_ai"] = 1

for c in ["hire_year", "certificates", "awards", "activities", "is_ai", "source_job_id"]:
    d[c] = d[c].astype("Int64")
d.to_csv(OUT, index=False, encoding="utf-8-sig")
print(len(d), "행 중", int(empty.sum()), "행을 가상 데이터로 채움")
