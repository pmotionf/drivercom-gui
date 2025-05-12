import { createSignal } from "solid-js";
import { Toast } from "~/components/ui/toast.tsx";
import { IconX } from "@tabler/icons-solidjs";
import { panelContexts, tabContexts } from "~/GlobalState.ts";
import { PlotContext } from "~/components/Plot.tsx";
import { PanelLayout, PanelSizeContext } from "~/components/PanelLayout.tsx";
import { createStore } from "solid-js/store";
import { TabListContext } from "~/components/TabList.tsx";

export type LogViewerTabContext = {
  id: string;
  filePath: string;
  plotSplitIndex: number[][];
  plotContext: PlotContext[];
  tabName: string;
  plotZoomState: [number, number];
};

export type LogViewerPanelContext = {
  id: string;
  size: number;
};

function LogViewer() {
  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  if (!panelContexts.has("LogViewer") || !tabContexts.has("LogViewer")) {
    panelContexts.set("LogViewer", createSignal<PanelSizeContext[]>([]));
    tabContexts.set("LogViewer", createStore<TabListContext[]>([]));
  }

  return (
    <>
      <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
        <Toast.Toaster toaster={toaster}>
          {(toast) => (
            <Toast.Root>
              <Toast.Title>{toast().title}</Toast.Title>
              <Toast.Description>{toast().description}</Toast.Description>
              <Toast.CloseTrigger>
                <IconX />
              </Toast.CloseTrigger>
            </Toast.Root>
          )}
        </Toast.Toaster>
        <PanelLayout id="LogViewer" />
      </div>
    </>
  );
}

export default LogViewer;
