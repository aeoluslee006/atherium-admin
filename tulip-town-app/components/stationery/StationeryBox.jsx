"use client";

import { getStationeryById } from "./stationeryOptions";

/**
 * 완성된 편지지 배경 컴포넌트입니다. 이 파일을 그대로 복사해서 쓰세요.
 * 재구현하거나 스타일 값을 임의로 바꾸지 마세요 (특히 opacity, backgroundSize).
 *
 * 사용법 (글 상세/미리보기 화면):
 *   <StationeryBox stationeryId={post.stationery_id}>
 *     <p>{post.body}</p>
 *   </StationeryBox>
 *
 * 절대 하지 말아야 할 것 (전에 이 문제들 때문에 그림이 깨졌습니다):
 *   1. 모서리 이미지에 opacity를 낮추지 마세요 (기본값 1, 즉 불투명이 맞습니다).
 *      이 그림들은 워터마크가 아니라 또렷하게 보여야 하는 삽화입니다.
 *   2. 편지지 배경에 backgroundSize: "cover" 를 쓰지 마세요.
 *      모서리 그림은 항상 style.width로 지정한 고정 px 크기여야 하고,
 *      글 박스 크기에 맞춰 늘어나거나 줄어들면 안 됩니다.
 *   3. 모서리 이미지 위치(top/left/right/bottom)를 옮기지 마세요.
 */
export default function StationeryBox({ stationeryId, children, className = "" }) {
  const st = getStationeryById(stationeryId);

  const wrapperStyle = {
    position: "relative",
    overflow: "hidden",
    border: st.border,
    borderRadius: 8,
    backgroundColor: st.background.color || st.background.baseColor || "#ffffff",
    backgroundImage: st.background.image ? `url(${st.background.image})` : undefined,
    backgroundRepeat: st.background.repeat ? "repeat" : "no-repeat",
    // 배경은 절대 cover로 늘리지 않습니다. 색/패턴이 콘텐츠 길이에 맞춰 자연스럽게 이어집니다.
    padding: "32px 40px",
    minHeight: 200,
  };

  return (
    <div className={className} style={wrapperStyle}>
      {st.corners.map((c, i) => (
        <img
          key={i}
          src={c.file}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            width: c.size, // 고정 px. 절대 %나 auto로 바꾸지 마세요.
            height: "auto",
            pointerEvents: "none",
            userSelect: "none",
            opacity: 1, // 반드시 1. 낮추면 흐릿해집니다.
            zIndex: 0,
            ...cornerPosition(c.pos),
            ...(c.flipX || c.flipY
              ? {
                  transform: [c.flipX ? "scaleX(-1)" : "", c.flipY ? "scaleY(-1)" : ""]
                    .filter(Boolean)
                    .join(" "),
                }
              : {}),
          }}
        />
      ))}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function cornerPosition(pos) {
  const offset = 12;
  switch (pos) {
    case "tl":
      return { top: offset, left: offset };
    case "tr":
      return { top: offset, right: offset };
    case "bl":
      return { bottom: offset, left: offset };
    case "br":
      return { bottom: offset, right: offset };
    case "top-center":
      return { top: offset, left: "50%", transform: "translateX(-50%)" };
    default:
      return {};
  }
}
