import { PanelLayout } from "~/components/PanelLayout.tsx";
import { Pages } from "~/GlobalState";

function LogViewer() {
  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id={Pages.LogViewer} />
    </div>
  );
}

export default LogViewer;
