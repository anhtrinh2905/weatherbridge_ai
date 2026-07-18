import { useRef, useState, type KeyboardEvent } from "react";
import { scenarioTabs, type ScenarioTab } from "../landing.data";
import { SignalPanel } from "../../../shared/ui/SignalPanel";

const DEFAULT_INDEX = Math.max(
  scenarioTabs.findIndex((tab) => tab.id === "tua-chua"),
  0,
);

function ScenarioVisual({ tab }: { tab: ScenarioTab }) {
  if (tab.id === "tua-chua") return <SignalPanel compact />;

  return (
    <div className="signal-panel signal-panel--compact">
      <div className="flex items-center justify-between gap-4">
        <span className="signal-label">{tab.label}</span>
        <span className="signal-live">{tab.elevation}</span>
      </div>
      <div className="mt-8">
        <p className="signal-label">{tab.hazard}</p>
        <p className="mt-3 text-base leading-7 text-fg">{tab.description}</p>
      </div>
    </div>
  );
}

export function ScenarioTabs() {
  const [activeIndex, setActiveIndex] = useState(DEFAULT_INDEX);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = scenarioTabs[activeIndex];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (activeIndex + 1) % scenarioTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (activeIndex - 1 + scenarioTabs.length) % scenarioTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = scenarioTabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      setActiveIndex(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <section id="scenarios" className="landing-section landing-section--surface relative z-10">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="landing-section__meta"><span>04 / KỊCH BẢN THEO ĐỊA ĐIỂM</span><i /></div>
        <p className="section-kicker">Năm địa điểm, năm dạng rủi ro</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.045em] text-fg-strong sm:text-6xl">Mỗi độ cao một mối nguy khác nhau.</h2>

        <div className="scenario-tabs mt-10" role="tablist" aria-label="Chọn địa điểm dự báo" onKeyDown={onKeyDown}>
          {scenarioTabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`scenario-tab-${tab.id}`}
              aria-selected={activeIndex === i}
              aria-controls={`scenario-panel-${tab.id}`}
              tabIndex={activeIndex === i ? 0 : -1}
              className={`scenario-tab${activeIndex === i ? " scenario-tab--active" : ""}`}
              onClick={() => setActiveIndex(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`scenario-panel-${active.id}`}
          aria-labelledby={`scenario-tab-${active.id}`}
          key={active.id}
          className="scenario-panel mt-8"
        >
          <div>
            <p className="signal-label">{active.label} · {active.elevation}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-fg-strong sm:text-3xl">{active.hazard}</h3>
            <p className="mt-4 max-w-md leading-7 text-muted">{active.description}</p>
          </div>
          <ScenarioVisual tab={active} />
        </div>
      </div>
    </section>
  );
}
