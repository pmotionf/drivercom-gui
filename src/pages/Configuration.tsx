import { configFormFileFormat, Pages, tabContexts } from "~/GlobalState.ts";
import { Panel } from "~/components/Panel.tsx";
import { PanelLayout } from "~/components/PanelLayout.tsx";
import { TabContext, TabList } from "~/components/TabList.tsx";
import { ConfigTabContent } from "./Configuration/ConfigTabContent.tsx";
import {
  AccordionStatuses,
  GainLockStatuses,
  LinkedStatuses,
} from "~/components/ConfigForm.tsx";
import { ConnectButton } from "./Connect/ConnectButton.tsx";

function Configuration() {
  const createTab = (key: string) => {
    const id = crypto.randomUUID();
    const accordionStatuses: AccordionStatuses = new Map();
    const linkedStatuses: LinkedStatuses = new Map();
    const gainLockStatuses: GainLockStatuses = new Map();
    const newTab = {
      tab: {
        id: id,
        tabName: "New File",
      },
      tabPage: {
        configTabPage: {
          filePath: "",
          configForm: JSON.parse(JSON.stringify(configFormFileFormat())),
          configAccordionStatuses: accordionStatuses,
          configLinkedStatuses: linkedStatuses,
          configGainLockStatuses: gainLockStatuses,
        },
      },
    } as TabContext;

    if (tabContexts.has(key)) {
      const tabCtx = tabContexts.get(key)!;
      tabCtx[1]({
        tabContext: [...tabCtx[0].tabContext, newTab],
        focusedTab: newTab.tab.id,
      });
    }
  };

  return (
    <>
      <PanelLayout id={Pages.Configuration}>
        <Panel>
          <TabList onCreateTab={(key) => createTab(key)}>
            <ConfigTabContent />
          </TabList>
        </Panel>
      </PanelLayout>
      <ConnectButton
        style={{ position: "absolute", top: "4rem", right: "1rem" }}
      />
    </>
  );
}

export default Configuration;
