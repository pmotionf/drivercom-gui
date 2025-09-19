import { TagsInput } from "~/components/ui/tags-input";
import { For } from "solid-js";
import { IconButton } from "~/components/ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";
import { JSX } from "solid-js/h/jsx-runtime";

export type TagsInputsProps = JSX.HTMLAttributes<HTMLDivElement> & {
  value: string[];
  onValueChange?: (value: string[]) => void;
  variant?: "outline" | "ghost";
};

enum TabInputsVariant {
  outline = "1px",
  ghost = "0",
}

export const TagsInputs = (props: TagsInputsProps) => {
  return (
    <div>
      <TagsInput.Root
        blurBehavior="add"
        value={props.value}
        onValueChange={(details) => {
          props.onValueChange?.(details.value);
        }}
        width="100%"
      >
        <TagsInput.Context>
          {(api) => (
            <>
              <TagsInput.Control
                padding="0.2em"
                width="100%"
                borderWidth={
                  props.variant ? TabInputsVariant[props.variant] : "1px"
                }
              >
                <For each={api().value}>
                  {(value, index) => (
                    <TagsInput.Item index={index()} value={value}>
                      <TagsInput.ItemPreview>
                        <TagsInput.ItemText
                          overflow="hidden"
                          textOverflow="ellipsis"
                          maxWidth={"7rem"}
                        >
                          {value}
                        </TagsInput.ItemText>
                        <TagsInput.ItemDeleteTrigger
                          asChild={(triggerProps) => (
                            <IconButton
                              variant="link"
                              size="xs"
                              {...triggerProps()}
                            >
                              <IconX />
                            </IconButton>
                          )}
                        />
                      </TagsInput.ItemPreview>
                    </TagsInput.Item>
                  )}
                </For>
              </TagsInput.Control>
            </>
          )}
        </TagsInput.Context>
      </TagsInput.Root>
    </div>
  );
};
