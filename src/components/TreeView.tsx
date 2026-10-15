import {
  createTreeCollection,
  TreeView as ArkTreeView,
} from "@ark-ui/solid/tree-view";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-solid";
import { For } from "solid-js";
import { css } from "styled-system/css";
import { Dynamic } from "solid-js/web";

export const TreeView = (props: ArkTreeView.RootProps<Node>) => {
  return (
    <ArkTreeView.Root
      class={css({
        color: "fg.default",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "100%",
        height: "100%",
        background: "gray.1",
        overflowY: "auto",
        borderRightWidth: "1px",
      })}
      {...props}
      collection={props.collection}
    >
      <ArkTreeView.Tree class={css({ gap: "1rem" })}>
        <For each={props.collection.rootNode.children}>
          {(node, index) => <TreeNode node={node} indexPath={[index()]} />}
        </For>
      </ArkTreeView.Tree>
    </ArkTreeView.Root>
  );
};

const TreeNode = (props: ArkTreeView.NodeProviderProps<Node>) => {
  return (
    <ArkTreeView.NodeProvider node={props.node} indexPath={props.indexPath}>
      <ArkTreeView.NodeContext>
        {(nodeState) =>
          props.node.children ? (
            <ArkTreeView.Branch class={css({ position: "relative" })}>
              <ArkTreeView.BranchControl
                class={css({
                  display: "flex",
                  alignItems: "center",
                  rowGap: "3rem",
                  userSelect: "none",
                  position: "relative",
                  cursor: "pointer",
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  font: "inherit",
                  color: "fg.muted",
                  textAlign: "start",
                  _hover: {
                    background: "gray.3",
                  },
                  _focus: {
                    _hover: {
                      background: "gray.5",
                    },
                    background: "gray.5",
                    color: "fg.default",
                  },
                })}
              >
                <ArkTreeView.BranchIndicator
                  class={css({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "fg.muted",
                    transformOrigin: "center",
                    transition: "transform 150ms ease",
                    _open: {
                      transform: "rotate(90deg)",
                    },
                  })}
                >
                  <Dynamic
                    style={{ width: "0.875rem", height: "0.875rem" }}
                    component={ChevronRightIcon}
                  />
                </ArkTreeView.BranchIndicator>
                <ArkTreeView.BranchText
                  onClick={(e) => e.stopPropagation()}
                  class={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  })}
                >
                  <Dynamic
                    class={css({
                      width: "1rem",
                      height: "1rem",
                      color: "fg.muted",
                    })}
                    component={
                      nodeState().expanded ? FolderOpenIcon : FolderIcon
                    }
                  />
                  {props.node.name}
                </ArkTreeView.BranchText>
              </ArkTreeView.BranchControl>
              <ArkTreeView.BranchContent
                class={css({
                  display: "flex",
                  flexDirection: "column",
                  paddingLeft: "1rem",
                  gap: "0.125rem",
                  _open: {
                    animation:
                      "expand-height 150ms ease-out, fade-in 150ms ease-out",
                  },
                  _closed: {
                    animation:
                      "collapse-height 150ms ease-out, fade-out 150ms ease-out;",
                  },
                })}
              >
                <ArkTreeView.BranchIndentGuide
                  class={css({
                    height: `calc(100% - 2rem)`,
                    width: "1px",
                    background: "border",
                    position: "absolute",
                    left: "0.45rem",
                    zIndex: "1",
                  })}
                />
                <For each={props.node.children}>
                  {(child, index) => (
                    <TreeNode
                      node={child}
                      indexPath={[...props.indexPath, index()]}
                    />
                  )}
                </For>
              </ArkTreeView.BranchContent>
            </ArkTreeView.Branch>
          ) : (
            <ArkTreeView.Item
              class={css({
                paddingLeft: "0.75rem",
                background: "transparent",
                font: "inherit",
                color: "fg.muted",
                textAlign: "start",
                _hover: {
                  background: "gray.3",
                },
                _focus: {
                  _hover: {
                    background: "gray.5",
                  },
                  background: "gray.5",
                  color: "fg.default",
                },
              })}
            >
              <ArkTreeView.ItemText
                class={css({
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                })}
              >
                <Dynamic
                  class={css({
                    width: "1rem",
                    height: "1rem",
                    color: "fg.muted",
                  })}
                  component={FileIcon}
                />

                {props.node.name}
              </ArkTreeView.ItemText>
            </ArkTreeView.Item>
          )
        }
      </ArkTreeView.NodeContext>
    </ArkTreeView.NodeProvider>
  );
};

interface Node {
  id: string;
  name: string;
  children?: Node[];
}

const generateBranch = (format: object, parent: string) => {
  const entries = Object.entries(format);
  const name = !parent.includes(`/`) ? parent : parent.split(`/`).at(-1)!;

  const node: Node = {
    id: parent,
    name: isNaN(Number(name)) ? name : `axis ${Number(name) + 1}`,
    children: [
      ...entries.map(([key, value]) => {
        const puncatation = typeof value === "object" ? "/" : "$";
        const id = `${parent.length > 0 ? parent + puncatation : ""}${key}`;
        if (typeof value !== "object") {
          return {
            id: id,
            name: isNaN(Number(key)) ? key : `axis ${Number(key) + 1}`,
          };
        } else {
          return generateBranch(value, id);
        }
      }),
    ],
  };
  return node;
};

export const generateTreeCollection = (format: object, labelName: string) => {
  const node = generateBranch(format, labelName);
  const collection = createTreeCollection<Node>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.name,
    rootNode: node,
  });
  return collection;
};
