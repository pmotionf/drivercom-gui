import { JSX } from "solid-js";
import { PanelLayoutContext } from "./PanelContext";

export const PanelLayoutProvider = (props: {
  children: JSX.Element;
  id: string;
  key: string;
  onDeletePanel: () => void;
  onCreatePanel: (tabLocation: string, newPanelKey: string) => void;
}) => {
  return (
    <PanelLayoutContext.Provider
      value={{
        id: props.id,
        key: props.key,
        onDeletePanel: () => {
          props.onDeletePanel();
        },
        onCreatePanel: (tabLocation, newPanelKey) => {
          props.onCreatePanel(tabLocation, newPanelKey);
        },
      }}
    >
      {props.children}
    </PanelLayoutContext.Provider>
  );
};
