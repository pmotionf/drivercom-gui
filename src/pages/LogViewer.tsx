import { Splitter } from "~/components/ui/splitter";
import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { LogViewerTabList } from "./LogViewer/LogViewerTabList";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import {
  logViewerPanelContexts,
  logViewerPanelSize,
  panelContexts,
  setLogViewPanelContexts,
  setLogViewPanelSize,
  tabContexts,
} from "~/GlobalState";
import { Spinner } from "~/components/ui/spinner";
import { PlotContext } from "~/components/Plot";
import { Stack } from "styled-system/jsx";
import { PanelLayout, PanelSizeContext } from "~/components/PanelLayout.tsx";
import { PanelContext } from "~/components/Panel";
import { createStore } from "solid-js/store";
import { tabContext } from "~/components/TabList";

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
    //tabContexts.set("LogViewer", createStore<tabContext[]>([]));
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
