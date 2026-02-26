import { Panel } from "~/components/Panel/Panel";
import { PanelLayout } from "~/components/Panel/PanelLayout";
import { TabContext, TabList } from "~/components/Tab/TabList";
import { Pages, tabStore } from "~/store/GlobalState";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { open } from "@tauri-apps/plugin-dialog";
import { toaster } from "~/services/Toaster";

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

              if (tabStore.has(key)) {
                const tabCtx = tabStore.get(key)!;
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
    </div>
  );
}

export default LogViewer;
