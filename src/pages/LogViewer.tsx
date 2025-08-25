import { Panel } from "~/components/Panel";
import { PanelLayout } from "~/components/PanelLayout.tsx";
import { TabContext, TabList } from "~/components/TabList";
import { Pages, tabContexts } from "~/GlobalState";
import { LogViewerTabPageContent } from "./LogViewer/LogViewerTabPageContent";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import { file } from "~/utils/file";

function LogViewer() {
  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const newTabCtx = (filePath: string): TabContext => {
    return {
      tab: {
        id: crypto.randomUUID(),
        tabName: filePath
          .replaceAll("\\", "/")
          .match(/[^?!//]+$/!)!
          .toString()
          .slice(0, -4) as string,
      },
      tabPage: {
        logViewerTabPage: {
          filePath: filePath.replaceAll("\\", "/"),
          plotSplitIndex: [],
          plotContext: [],
          plotXScale: [0, 0],
        },
        configTabPage: null,
      },
    };
  };

  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id={Pages.LogViewer}>
        <Panel>
          <TabList
            onCreateTab={async (key) => {
              try {
                const filePath = await file.openDialog("csv");
                const newTab = newTabCtx(filePath);
                if (tabContexts.has(key)) {
                  const tabCtx = tabContexts.get(key)!;
                  tabCtx[1]({
                    tabContext: [...tabCtx[0].tabContext, newTab],
                    focusedTab: newTab.tab.id,
                  });
                }
              } catch (e) {
                if (e) {
                  toaster.create({
                    title: "Invalid File",
                    description: e.toString(),
                    type: "error",
                  });
                }
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
