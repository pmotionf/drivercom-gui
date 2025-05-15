import { PanelLayout } from "~/components/PanelLayout.tsx";

function LogViewer() {
  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id="LogViewer" />
    </div>
  );
}

export default LogViewer;
