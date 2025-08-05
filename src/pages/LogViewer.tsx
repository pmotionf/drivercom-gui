import { Panel } from "~/components/Panel";
import { PanelLayout } from "~/components/PanelLayout.tsx";
import { TabContext, TabList } from "~/components/TabList";
import { Pages, tabContexts } from "~/GlobalState";
import { LogViewerTabPageContent } from "./LogViewer/LogViewerTabPageContent";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";

function LogViewer() {
  async function openFileDialog(): Promise<{
    id: string;
    filePath: string;
  } | null> {
    const path = await open({
      multiple: false,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (!path) {
      return null;
    }

    const extensions = path.slice(path.length - 4, path.length);
    if (extensions !== ".csv") {
      return null;
    }

    const tabId = crypto.randomUUID();
    return { id: tabId, filePath: path.replaceAll("\\", "/") };
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id={Pages.LogViewer}>
        <Panel>
          <TabList
            onCreateTab={async (key) => {
              const newTabInfo = await openFileDialog();
              if (!newTabInfo) {
                toaster.create({
                  title: "Invalid File",
                  description: "The file is invalid.",
                  type: "error",
                });
                return;
              }

              const newTab: TabContext = {
                tab: {
                  id: newTabInfo.id,
                  tabName: newTabInfo.filePath
                    .replaceAll("\\", "/")
                    .match(/[^?!//]+$/!)!
                    .toString()
                    .slice(0, -4) as string,
                },
                tabPage: {
                  logViewerTabPage: {
                    filePath: newTabInfo.filePath.replaceAll("\\", "/"),
                    plotSplitIndex: [],
                    plotContext: [],
                    plotXScale: [0, 0],
                  },
                  configTabPage: null,
                },
              };

              if (tabContexts.has(key)) {
                const tabCtx = tabContexts.get(key)!;
                tabCtx[1]({
                  tabContext: [...tabCtx[0].tabContext, newTab],
                  focusedTab: newTab.tab.id,
                });
              }
            }}
          >
            <LogViewerTabPageContent />
          </TabList>
        </Panel>
      </PanelLayout>
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
    </div>
  );
}

export default LogViewer;
