import { DysonverseSkillTree, DysonverseSkillTreeIcons, DysonverseSkillTreeLayout } from "@ids/balance";
import type { GameAction, GameState } from "@ids/core";
import { formatNumber } from "@ids/core";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

const skillIconModules = import.meta.glob("../../../../UnityIDS/Assets/Sprites/SkillIcons/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

function fileNameFromPath(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] ?? p;
}

const skillIconUrlByFileName: ReadonlyMap<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [p, url] of Object.entries(skillIconModules)) {
    map.set(fileNameFromPath(p), url);
  }
  return map;
})();

export interface SkillTreePanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

function getSkillFlag(dvst: GameState["dysonVerseSkillTreeData"], key: string): boolean {
  return Boolean((dvst as unknown as Record<string, unknown>)[key]);
}

function stripUnityRichText(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<color=[^>]+>/gi, "")
    .replace(/<\/color>/gi, "")
    .replace(/<sprite=0>/gi, "Science")
    .trim();
}

export function SkillTreePanel(props: SkillTreePanelProps) {
  const { state, dispatch } = props;

  const dvst = state.dysonVerseSkillTreeData;
  const pp = state.prestigePlus;

  const [selectedSkillId, setSelectedSkillId] = useState<number>(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pendingZoomRef = useRef<{ worldX: number; worldY: number; offsetX: number; offsetY: number } | null>(null);
  const didInitialCenterRef = useRef(false);
  const panRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);
  const [panning, setPanning] = useState(false);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const fmt = state.settings.numberFormatting;
  const f = (x: number) => formatNumber(x, fmt);

  const skillById = useMemo(() => {
    const map = new Map<number, (typeof DysonverseSkillTree)[number]>();
    for (const skill of DysonverseSkillTree) map.set(skill.id, skill);
    return map;
  }, []);

  const positionById = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const node of DysonverseSkillTreeLayout.nodes) map.set(node.id, { x: node.x, y: node.y });
    return map;
  }, []);

  const iconFileNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const icon of DysonverseSkillTreeIcons.icons) map.set(icon.id, icon.fileName);
    return map;
  }, []);

  const bounds = useMemo(() => {
    const nodeSize = 100;
    const padding = 220;

    const xs = DysonverseSkillTreeLayout.nodes.map((n) => n.x);
    const ys = DysonverseSkillTreeLayout.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      nodeSize,
      padding,
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX + padding * 2 + nodeSize,
      height: maxY - minY + padding * 2 + nodeSize,
    };
  }, []);

  useEffect(() => {
    if (didInitialCenterRef.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const pos = positionById.get(1);
    if (!pos) return;

    didInitialCenterRef.current = true;

    const x = (pos.x - bounds.minX + bounds.padding + bounds.nodeSize / 2) * zoom;
    const y = (bounds.maxY - pos.y + bounds.padding + bounds.nodeSize / 2) * zoom;

    const left = x - viewport.clientWidth / 2;
    const top = y - viewport.clientHeight / 2;

    const maxScrollLeft = Math.max(0, bounds.width * zoom - viewport.clientWidth);
    const maxScrollTop = Math.max(0, bounds.height * zoom - viewport.clientHeight);

    viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, left));
    viewport.scrollTop = Math.max(0, Math.min(maxScrollTop, top));
  }, [bounds, positionById, zoom]);

  useEffect(() => {
    const pending = pendingZoomRef.current;
    if (!pending) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    pendingZoomRef.current = null;

    requestAnimationFrame(() => {
      viewport.scrollLeft = pending.worldX * zoom - pending.offsetX;
      viewport.scrollTop = pending.worldY * zoom - pending.offsetY;
    });
  }, [zoom]);

  function toCanvasPoint(pos: { x: number; y: number }) {
    const z = zoom;
    return {
      x: (pos.x - bounds.minX + bounds.padding + bounds.nodeSize / 2) * z,
      y: (bounds.maxY - pos.y + bounds.padding + bounds.nodeSize / 2) * z,
    };
  }

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = viewport.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const currentZoom = zoomRef.current;

      const deltaY = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      const factor = Math.exp(-deltaY * 0.0012);
      const nextZoom = clamp(currentZoom * factor, 0.5, 2.5);

      if (nextZoom === currentZoom) return;

      pendingZoomRef.current = {
        worldX: (viewport.scrollLeft + offsetX) / currentZoom,
        worldY: (viewport.scrollTop + offsetY) / currentZoom,
        offsetX,
        offsetY,
      };
      setZoom(nextZoom);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      viewport.removeEventListener("wheel", onWheel);
    };
  }, []);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement | null)?.closest("button")) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.setPointerCapture(e.pointerId);
    panRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: viewport.scrollLeft,
      startScrollTop: viewport.scrollTop,
    };
    setPanning(true);
    e.preventDefault();
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    if (!pan) return;
    if (pan.pointerId !== e.pointerId) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollLeft = pan.startScrollLeft - (e.clientX - pan.startX);
    viewport.scrollTop = pan.startScrollTop - (e.clientY - pan.startY);
    e.preventDefault();
  }

  function stopPanning() {
    if (!panRef.current) return;
    panRef.current = null;
    setPanning(false);
  }

  function isVisible(skill: (typeof DysonverseSkillTree)[number]): boolean {
    if (skill.purityLine && !pp.purity) return false;
    if (skill.isFragment && !pp.fragments) return false;
    if (skill.terraLine && !pp.terra) return false;
    if (skill.powerLine && !pp.power) return false;
    if (skill.paragadeLine && !pp.paragade) return false;
    if (skill.stellarLine && !pp.stellar) return false;
    if (skill.firstRunBlocked && !state.meta.firstInfinityDone) return false;
    return true;
  }

  function canBuy(skill: (typeof DysonverseSkillTree)[number]): boolean {
    if (getSkillFlag(dvst, skill.key)) return false;

    if (!isVisible(skill)) return false;
    if (dvst.skillPointsTree < skill.cost) return false;

    for (const reqId of skill.requirements ?? []) {
      const req = skillById.get(reqId);
      if (!req) return false;
      if (!getSkillFlag(dvst, req.key)) return false;
    }
    for (const reqId of skill.shadowRequirements ?? []) {
      const req = skillById.get(reqId);
      if (!req) return false;
      if (!getSkillFlag(dvst, req.key)) return false;
    }
    for (const exId of skill.exclusiveWith ?? []) {
      const ex = skillById.get(exId);
      if (!ex) continue;
      if (getSkillFlag(dvst, ex.key)) return false;
    }

    return true;
  }

  const selected = skillById.get(selectedSkillId) ?? null;

  const nodeSize = bounds.nodeSize * zoom;
  const canvasWidth = bounds.width * zoom;
  const canvasHeight = bounds.height * zoom;

  const rootStyle = useMemo(() => ({ "--skill-zoom": zoom } as CSSProperties), [zoom]);

  return (
    <div className="skillTreeRoot" style={rootStyle}>
      <div className="skillTreeTopBar">
        <div className="skillTreeTopBarStats">
          Skill points: <strong>{dvst.skillPointsTree}</strong>
          <span className="skillTreeTopBarDivider">·</span>
          Fragments: <strong>{dvst.fragments}</strong>
        </div>
        <button type="button" onClick={() => dispatch({ type: "SKILL_TREE_RESET" })}>
          Reset refundable
        </button>
      </div>

      <div className="segRow" role="group" aria-label="Skill presets">
        <div style={{ color: "#c8b7d6", padding: "8px 0" }}>Save preset:</div>
        {[1, 2, 3, 4, 5].map((p) => (
          <button
            key={`save-${p}`}
            type="button"
            className="seg"
            onClick={() => dispatch({ type: "SKILL_TREE_SAVE_PRESET", preset: p as 1 | 2 | 3 | 4 | 5 })}
          >
            {p}
          </button>
        ))}
        <div style={{ color: "#c8b7d6", padding: "8px 0" }}>Load preset:</div>
        {[1, 2, 3, 4, 5].map((p) => (
          <button
            key={`load-${p}`}
            type="button"
            className="seg"
            onClick={() => dispatch({ type: "SKILL_TREE_LOAD_PRESET", preset: p as 1 | 2 | 3 | 4 | 5 })}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="skillTreeMain">
        <div
          ref={viewportRef}
          className={panning ? "skillTreeViewport dragging" : "skillTreeViewport"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPanning}
          onPointerCancel={stopPanning}
          onLostPointerCapture={stopPanning}
        >
          <div className="skillTreeCanvas" style={{ width: canvasWidth, height: canvasHeight }}>
            <svg className="skillTreeLines" width={canvasWidth} height={canvasHeight}>
              {DysonverseSkillTree.flatMap((skill) => {
                if (!isVisible(skill)) return [];

                const fromPos = positionById.get(skill.id);
                if (!fromPos) return [];
                const from = toCanvasPoint(fromPos);

                const shadow = new Set(skill.shadowRequirements ?? []);
                const edges = [...(skill.requirements ?? []), ...(skill.shadowRequirements ?? [])];

                return edges
                  .map((reqId) => {
                    const reqSkill = skillById.get(reqId);
                    if (!reqSkill || !isVisible(reqSkill)) return null;
                    const toPos = positionById.get(reqId);
                    if (!toPos) return null;
                    const to = toCanvasPoint(toPos);
                    return {
                      key: `${skill.id}->${reqId}`,
                      from,
                      to,
                      shadow: shadow.has(reqId),
                    };
                  })
                  .filter((x): x is { key: string; from: { x: number; y: number }; to: { x: number; y: number }; shadow: boolean } => x != null);
              }).map((edge) => (
                <line
                  key={edge.key}
                  x1={edge.from.x}
                  y1={edge.from.y}
                  x2={edge.to.x}
                  y2={edge.to.y}
                  className={edge.shadow ? "skillTreeLine shadow" : "skillTreeLine"}
                />
              ))}
            </svg>

            {DysonverseSkillTree.map((skill) => {
              if (!isVisible(skill)) return null;

              const pos = positionById.get(skill.id);
              if (!pos) return null;

              const canvas = toCanvasPoint(pos);
              const left = canvas.x - nodeSize / 2;
              const top = canvas.y - nodeSize / 2;

              const owned = getSkillFlag(dvst, skill.key);
              const blockedByExclusive = (skill.exclusiveWith ?? []).some((exId) => {
                const other = skillById.get(exId);
                return other ? getSkillFlag(dvst, other.key) : false;
              });
              const base =
                skill.isFragment ? "fragment" : skill.requirements?.length || skill.shadowRequirements?.length ? "normal" : "root";

              const cls = [
                "skillNodeButton",
                base,
                owned ? "owned" : "",
                blockedByExclusive && !owned ? "exclusiveLocked" : "",
                selectedSkillId === skill.id ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const iconFileName = iconFileNameById.get(skill.id) ?? null;
              const iconUrl = iconFileName ? skillIconUrlByFileName.get(iconFileName) ?? null : null;

              return (
                <div key={skill.id} className="skillNode" style={{ left, top, width: nodeSize }}>
                  <button type="button" className={cls} aria-pressed={owned} onClick={() => setSelectedSkillId(skill.id)}>
                    {iconUrl ? <img className="skillNodeIcon" src={iconUrl} alt="" draggable={false} /> : <div className="skillNodeIcon" aria-hidden="true" />}
                  </button>
                  <div className="skillNodeLabel">{stripUnityRichText(skill.skillNamePopup || skill.skillName)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="skillTreeDetails">
          {selected ? (
            (() => {
              const owned = getSkillFlag(dvst, selected.key);
              const inAuto = state.dysonVerseSaveData.skillAutoAssignmentList.includes(selected.id);

              const canPurchase = canBuy(selected);
              const canRefund =
                owned &&
                selected.refundable &&
                !DysonverseSkillTree.some((other) => {
                  if (other.id === selected.id) return false;
                  const otherOwned = getSkillFlag(dvst, other.key);
                  if (!otherOwned) return false;
                  return other.requirements?.includes(selected.id) ?? false;
                });

              return (
                <div className="skillTreeDetailsBody">
                  <div className="skillTreeDetailsTitle">{stripUnityRichText(selected.skillNamePopup || selected.skillName)}</div>
                  <div className="skillTreeDetailsMeta">
                    #{selected.id} · Cost {selected.cost} · Skill points {f(dvst.skillPointsTree)}
                  </div>

                  <div className="skillTreeDetailsSectionTitle">Description</div>
                  <pre className="skillTreeDetailsText">{stripUnityRichText(selected.skillDescription)}</pre>

                  <div className="skillTreeDetailsSectionTitle">Technical</div>
                  <pre className="skillTreeDetailsText">{stripUnityRichText(selected.skillTechnicalDescription)}</pre>

                  <label className="checkboxRow" style={{ padding: 0, marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={inAuto}
                      onChange={() => dispatch({ type: "SKILL_TREE_AUTO_ASSIGN_TOGGLE", skillId: selected.id })}
                    />
                    Auto-assign after prestige
                  </label>

                  <button
                    type="button"
                    style={{ marginTop: 12 }}
                    disabled={owned ? !canRefund : !canPurchase}
                    onClick={() => dispatch({ type: "SKILL_TREE_TOGGLE", skillId: selected.id })}
                  >
                    {owned ? "Refund" : "Buy"}
                  </button>

                  <div className="skillTreeDetailsMeta" style={{ marginTop: 10 }}>
                    {owned ? "Owned" : canPurchase ? "Available" : "Locked"}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="placeholder">Select a skill.</div>
          )}
        </div>
      </div>
    </div>
  );
}
