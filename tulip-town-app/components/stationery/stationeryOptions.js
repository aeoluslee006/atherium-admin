// 편지지(스테이셔너리) 옵션 목록 — v2 (배경 크기 문제 수정 버전)
//
// 왜 바뀌었나:
// 이전 버전은 편지지 1장을 통짜 이미지(600x800 세로 비율)로 만들어서
// background-size: cover 로 넣었더니, 글 박스가 가로로 넓은 카드라
// 그림이 확대되면서 한쪽 구석만 잘려 보이는 문제가 있었습니다.
//
// 그래서 각 편지지를 "배경색/패턴"과 "모서리 장식 그림(고정 크기)"으로 분리했습니다.
// 모서리 장식은 글 길이와 상관없이 항상 같은 크기로 특정 모서리에 붙고,
// 배경은 글이 길어지든 짧아지든 자연스럽게 늘어납니다. (실제 편지지처럼 동작)
//
// 적용 방법은 파일 맨 아래 주석 참고.

export const STATIONERY_OPTIONS = [
  {
    id: "classic-notes",
    name: "클래식 노트",
    background: { image: "/stationery/classic-notes-tile.svg", repeat: true }, // 기존 노트 배경을 타일 패턴으로 옮겨주세요
    border: "1px solid #e2ded2",
    corners: [],
  },
  {
    id: "watercolor-floral",
    name: "수채화 꽃",
    background: { color: "#fffdfa" },
    border: "1px solid #e8c7cf",
    corners: [
      { pos: "tl", file: "/stationery/corners/watercolor-floral-corner.svg", size: 110 },
      { pos: "tr", file: "/stationery/corners/watercolor-floral-corner.svg", size: 110, flipX: true },
      { pos: "bl", file: "/stationery/corners/watercolor-floral-corner.svg", size: 110, flipY: true },
      { pos: "br", file: "/stationery/corners/watercolor-floral-corner.svg", size: 110, flipX: true, flipY: true },
    ],
  },
  {
    id: "pastel-cute",
    name: "파스텔 큐트",
    background: { image: "/stationery/corners/pastel-cute-tile.svg", repeat: true },
    border: "2px dashed #f7b8cf",
    corners: [{ pos: "top-center", file: "/stationery/corners/pastel-cute-ribbon.svg", size: 70 }],
  },
  {
    id: "vintage-kraft",
    name: "빈티지 크래프트",
    background: { image: "/stationery/corners/vintage-kraft-tile.svg", repeat: true, baseColor: "#c8a878" },
    border: "1px solid #8a6a45",
    corners: [{ pos: "br", file: "/stationery/corners/vintage-kraft-corner.svg", size: 120 }],
  },
  {
    id: "botanical-lineart",
    name: "보태니컬 라인아트",
    background: { color: "#fffaf3" },
    border: "1px solid #d8ddc9",
    corners: [
      { pos: "tl", file: "/stationery/corners/botanical-lineart-corner.svg", size: 100 },
      { pos: "tr", file: "/stationery/corners/botanical-lineart-corner.svg", size: 100, flipX: true },
      { pos: "bl", file: "/stationery/corners/botanical-lineart-corner.svg", size: 100, flipY: true },
      { pos: "br", file: "/stationery/corners/botanical-lineart-corner.svg", size: 100, flipX: true, flipY: true },
    ],
  },
  {
    id: "bicycle-lineart",
    name: "자전거",
    background: { color: "#fbf9f4" },
    border: "1px solid #e2ded2",
    corners: [{ pos: "bl", file: "/stationery/corners/bicycle-lineart-corner.svg", size: 150 }],
  },
  {
    id: "car-lineart",
    name: "자동차",
    background: { color: "#fbf9f4" },
    border: "1px solid #e2ded2",
    corners: [
      { pos: "br", file: "/stationery/corners/car-lineart-corner.svg", size: 150 },
      { pos: "tl", file: "/stationery/corners/car-lineart-cloud-corner.svg", size: 70 },
    ],
  },
  {
    id: "diary-doodle",
    name: "다이어리 낙서",
    background: { color: "#fbf9f4" },
    border: "1px solid #e2ded2",
    corners: [
      { pos: "tl", file: "/stationery/corners/diary-doodle-clusterA.svg", size: 100 },
      { pos: "tr", file: "/stationery/corners/diary-doodle-clusterB.svg", size: 90 },
      { pos: "bl", file: "/stationery/corners/diary-doodle-clusterB.svg", size: 90, flipX: true },
      { pos: "br", file: "/stationery/corners/diary-doodle-clusterA.svg", size: 100, flipX: true },
    ],
  },
  {
    id: "plum-blossom",
    name: "매화",
    background: { color: "#faf7f2" },
    border: "1px solid #d8c9c2",
    corners: [{ pos: "br", file: "/stationery/corners/plum-blossom-corner.svg", size: 170 }],
  },
  {
    id: "airplane-lineart",
    name: "비행기",
    background: { color: "#fbf9f4" },
    border: "1px solid #e2ded2",
    corners: [{ pos: "tr", file: "/stationery/corners/airplane-lineart-corner.svg", size: 150 }],
  },
];

export function getStationeryById(id) {
  return STATIONERY_OPTIONS.find((s) => s.id === id) || STATIONERY_OPTIONS[0];
}

/*
적용 방법 (post 상세/미리보기 화면):

import { getStationeryById } from "./stationeryOptions";

function StationeryBox({ post, children }) {
  const st = getStationeryById(post.stationery_id);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        border: st.border,
        backgroundColor: st.background.color || st.background.baseColor,
        backgroundImage: st.background.image ? `url(${st.background.image})` : undefined,
        backgroundRepeat: st.background.repeat ? "repeat" : "no-repeat",
        padding: "32px 40px",
        minHeight: 200, // 글 길이에 따라 자동으로 늘어남
      }}
    >
      {st.corners.map((c, i) => (
        <img
          key={i}
          src={c.file}
          alt=""
          style={{
            position: "absolute",
            width: c.size,
            height: "auto",
            pointerEvents: "none",
            ...cornerPosition(c.pos),
            transform: [
              c.flipX ? "scaleX(-1)" : "",
              c.flipY ? "scaleY(-1)" : "",
            ].join(" ") || undefined,
          }}
        />
      ))}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function cornerPosition(pos) {
  const offset = "12px";
  switch (pos) {
    case "tl": return { top: offset, left: offset };
    case "tr": return { top: offset, right: offset };
    case "bl": return { bottom: offset, left: offset };
    case "br": return { bottom: offset, right: offset };
    case "top-center": return { top: offset, left: "50%", transform: "translateX(-50%)" };
    default: return {};
  }
}

핵심: 모서리 그림은 항상 고정 크기(px)로 절대위치 배치되고,
배경(색/타일)은 글 길이에 맞춰 자연스럽게 늘어나므로
글이 짧든 길든 그림이 찌그러지거나 잘리지 않습니다.
*/
