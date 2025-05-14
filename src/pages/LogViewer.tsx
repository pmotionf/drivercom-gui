import { createSignal } from "solid-js";
import { panelContexts } from "~/GlobalState.ts";
import { PanelLayout, PanelSizeContext } from "~/components/PanelLayout.tsx";

function LogViewer() {
  if (!panelContexts.has("LogViewer")) {
    panelContexts.set("LogViewer", createSignal<PanelSizeContext[]>([]));
  }

  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id="LogViewer" />
    </div>
  );
}

export default LogViewer;
