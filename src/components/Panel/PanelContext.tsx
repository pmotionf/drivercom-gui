import { createContext } from "solid-js";
import { TabLocation } from "../Tab/TabList";

export type PanelProps = {
  id: string;
  key: string;
  onDeletePanel?: () => void;
  onCreatePanel?: (tabLocation: TabLocation, newPanelKey: string) => void;
};

export const PanelLayoutContext = createContext<PanelProps>();
