/*
 * 합격자 정보 패널 (서현 담당)
 *
 * 추천 카드의 "합격자 정보 보기"를 누르면 index.html이 합격자 앱을 호출한 뒤
 * renderPassers(영역, 응답)을 부른다. 이 파일만 고치면 합격자 화면을 바꿀 수 있다.
 *
 * 응답 모양 (sample/passers.json 참고)
 *   { data: { passers: [...], counts, notice, message, ... } | null, markdown: "합격자 자료가 없는 경우의 안내 문구" }
 *   passers[i]: candidate_id, hire, stage, job_title, university, major, gpa, gpa_scale, language{type,score},
 *               data_origin("가상 데이터" 등), is_ai, cert_count, award_count, activity_count, similar_points[],
 *               expert_review{star, sections{별점이유,좋은점,아쉬운점,보완요소}},
 *               qas[{no, question, subtitle, segments[{text, notes[{type, comment, ai_revision{text,needs_input,label}}]}]}]
 *
 * 로컬에서 확인: 폴더에서 `npx serve` 후 http://localhost:3000/?mock=1 을 열고 추천 카드의 버튼을 누른다.
 * (?mock=1이면 Dify를 부르지 않고 sample/ 폴더의 예시 데이터를 쓴다.)
 */
(function () {
  // 태그, 속성, 자식으로 요소를 만든다. 글자는 textContent로 넣어서 외부 문자열이 HTML로 해석되지 않는다.
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      key === "class" ? (node.className = value) : node.setAttribute(key, value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(child));
    }
    return node;
  }

  const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
  const show = (value) => (value === null || value === undefined || value === "" ? "정보 없음" : value);

  function specTable(p) {
    const language = p.language && p.language.type ? `${p.language.type} ${show(p.language.score)}` : "정보 없음";
    const rows = [
      ["합격 시기 / 구분", `${show(p.hire)} / ${show(p.stage)}`],
      ["직무", show(p.job_title)],
      ["학교 구분 / 전공", `${show(p.university)} / ${show(p.major)}`],
      ["학점", p.gpa ? `${p.gpa} / ${p.gpa_scale}` : "정보 없음"],
      ["어학", language],
      ["자격증 / 수상 / 활동", `${show(p.cert_count)} / ${show(p.award_count)} / ${show(p.activity_count)}`],
    ];
    if (p.similar_points && p.similar_points.length) rows.push(["나와 비슷한 점", p.similar_points.join(", ")]);
    return h("dl", { class: "ps-spec" }, rows.map(([label, value]) => [h("dt", {}, label), h("dd", {}, value)]));
  }

  function review(r) {
    if (!r) return null;
    const stars = "★".repeat(Number(r.star) || 0) + "☆".repeat(5 - (Number(r.star) || 0));
    return h("section", { class: "ps-block" },
      h("h4", {}, "전문가 총평 ", h("span", { class: "ps-stars", "aria-label": `별점 ${r.star}점` }, stars)),
      h("dl", { class: "ps-spec" }, Object.entries(r.sections || {}).map(([label, text]) => [h("dt", {}, label), h("dd", {}, text)])));
  }

  // 세 문장 이상이면 문단으로 본다. 문단 전체에 단 첨삭은 하이라이트하지 않는다.
  const isParagraph = (text) => (String(text).trim().match(/[.!?。…]+(\s|$)/g) || []).length > 2;

  // 첨삭 한 개: 번호, 이모티콘, 구분(아쉬운점은 빨강, 좋은점은 파랑), 코멘트, (있으면) AI 수정 예시
  function noteView(mark, note) {
    const weak = note.type === "아쉬운점";
    return h("div", { class: "ps-note" },
      h("b", {}, `${mark} ${weak ? "🔧" : "👍"} `, h("span", { class: weak ? "ps-t-weak" : "ps-t-good" }, note.type)), " ", note.comment,
      note.ai_revision && h("div", { class: "ps-ai" },
        h("small", {}, note.ai_revision.label || "AI 수정 예시"),
        h("div", {}, note.ai_revision.text),
        (note.ai_revision.needs_input || []).length > 0 && h("small", {}, "필요한 정보: " + note.ai_revision.needs_input.join(", "))));
  }

  // 문항 한 개: 첨삭이 달린 문장(또는 문단) 바로 아래에 그 첨삭을 보여 준다.
  // 한두 문장이면 하이라이트하고, 문단(세 문장 이상)이면 하이라이트 없이 글자만 두며 번호는 붙인다.
  // 문항 제목만 먼저 보이고, 눌러서 펼치면 자소서 내용과 전문가 첨삭이 나온다. (기본은 접힘)
  function qa(item) {
    let number = 0;
    const body = h("div", { class: "ps-answer" }, (item.segments || []).map((segment) => {
      if (!segment.notes || !segment.notes.length) return segment.text;
      const marks = [];
      const notes = segment.notes.map((note) => {
        const mark = CIRCLED[number] || String(number + 1);
        number += 1;
        marks.push(h("sup", {}, mark));
        return noteView(mark, note);
      });
      const text = String(segment.text || "").trim();
      const weak = segment.notes.some((note) => note.type === "아쉬운점");
      const quote = isParagraph(text) ? text : h("mark", { class: weak ? "ps-weak" : "ps-good" }, text);
      return h("div", { class: "ps-seg" }, h("div", {}, quote, marks), notes);
    }));
    return h("details", { class: "ps-qa" },
      h("summary", { class: "ps-qa-head" },
        h("span", { class: "ps-qa-title" }, `문항 ${item.no}. ${item.question}`),
        number > 0 && h("span", { class: "ps-qa-count" }, `첨삭 ${number}`)),
      h("div", { class: "ps-qa-body" },
        item.subtitle && h("p", { class: "ps-sub" }, item.subtitle),
        body));
  }

  function passer(p) {
    const origin = p.is_ai ? "가상 데이터" : "실제 수집";
    return h("section", { class: "ps-passer" },
      h("h3", {}, `${p.candidate_id} `, h("span", { class: p.is_ai ? "ps-tag virtual" : "ps-tag real" }, p.data_origin || origin)),
      p.is_ai && h("p", { class: "ps-warn" }, "실제 합격자가 아니라 만들어진 예시 자료입니다."),
      specTable(p), review(p.expert_review),
      qaBlock(p));
  }

  // 합격자 한 명의 문항 목록. 제목 옆 버튼으로 이 합격자의 문항만 한꺼번에 펼치거나 접는다.
  function qaBlock(p) {
    const items = (p.qas || []).map(qa);
    const button = (label, open) => {
      const node = h("button", { type: "button", class: "ps-btn" }, label);
      node.addEventListener("click", () => items.forEach((item) => { item.open = open; }));
      return node;
    };
    return h("section", { class: "ps-block" },
      h("div", { class: "ps-block-head" },
        h("h4", {}, "합격 자소서와 전문가 첨삭"),
        items.length > 0 && h("div", { class: "ps-actions" }, button("모두 펼치기", true), button("모두 접기", false))),
      items);
  }

  window.renderPassers = function (root, payload) {
    root.replaceChildren();
    const data = payload && payload.data;
    if (!data || !(data.passers || []).length) {
      root.append(h("p", { class: "ps-empty" }, (payload && payload.markdown) || (data && data.message) || "이 공고의 합격자 자료가 없습니다."));
      return;
    }
    root.append(h("div", { class: "ps-wrap" },
      h("p", { class: "ps-count" }, `합격자 ${data.passers.length}명 (실제 수집 ${(data.counts || {}).real || 0}, 가상 데이터 ${(data.counts || {}).synthetic || 0})`),
      data.passers.map(passer),
      data.notice && h("p", { class: "ps-notice" }, data.notice)));
  };
})();
