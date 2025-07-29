import { Panel } from "~/components/Panel";
import { PanelLayout } from "~/components/PanelLayout.tsx";
import { TabList } from "~/components/TabList";
import { Pages } from "~/GlobalState";
import { LogViewerTabPageContent } from "./LogViewer/LogViewerTabPageContent";

function LogViewer() {
  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id={Pages.LogViewer}>
        <Panel>
          <TabList>
            <LogViewerTabPageContent />
          </TabList>
        </Panel>
      </PanelLayout>
    </div>
  );
}

export default LogViewer;
