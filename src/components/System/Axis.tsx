import { useContext } from "solid-js";
import { LineContext } from "./Line.tsx";
import { Stack } from "styled-system/jsx";
import { For } from "solid-js/web";
import { Text } from "../ui/text.tsx";

export function Axis() {
  const value = useContext(LineContext);
  if (!value) return;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "overflow-x": "auto",
        "overflow-y": "hidden",
      }}
    >
      <Stack direction="row" width="100%" gap="1rem">
        <For each={value}>
          {(axes) => (
            <Stack
              width="17rem"
              height="6rem"
              marginBottom="1rem"
              direction="row"
              gap="0.5rem"
              borderRadius="0.2rem"
              padding="0.5rem"
              paddingBottom="1rem"
              borderWidth="1px"
              backgroundColor="bg.muted"
            >
              <For each={axes}>
                {(axis) => (
                  <Stack
                    width="5rem"
                    height="5rem"
                    borderRadius="0.5rem"
                    borderWidth="1px"
                    backgroundColor="bg.default"
                  >
                    <Text fontWeight="bold" padding="0.5rem">
                      Axis {axis}
                    </Text>
                  </Stack>
                )}
              </For>
            </Stack>
          )}
        </For>
      </Stack>
    </div>
  );
}
