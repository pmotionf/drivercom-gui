import { onMount } from "solid-js";
import { Button } from "~/components/ui/styled/button.tsx";
import { connect, listen } from "@kuyoonjo/tauri-plugin-tcp";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";

function Monitoring() {
  onMount(async () => {
    const client = crypto.randomUUID();
    const host = "192.168.0.7";
    const port = 9001;

    await connect(client, `${host}:${port}`);
    await listen((x) => {
      console.log(x.payload!.event!.message!.data);
    });
  });

  return (
    <Stack direction="row" width="100%" height="100%">
      <div style={{ height: "100%", width: `calc(100% - 20rem)` }}></div>
      <Stack
        style={{
          height: "100%",
          width: "20rem",
          position: "fixed",
          left: `calc(100% - 20rem)`,
        }}
        borderLeftWidth="2px"
        gap="0"
      >
        <Stack width="100%" borderBottomWidth="2px" padding="1rem">
          {/* Line Area */}
          <Text fontWeight="bold" size="lg">
            Line
          </Text>
          <Stack direction="row" width="100%">
            <Text
              size="sm"
              width="20%"
              color="fg.muted"
              marginRight="0.5rem"
              marginTop="0.4rem"
            >
              ID
            </Text>
            <Stack
              background="bg.muted"
              width="80%"
              borderRadius="0.5rem"
              height="2rem"
            >
              <input
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  outline: "none",
                  "white-space": "nowrap",
                  overflow: "hidden",
                  display: "block",
                  "text-overflow": "ellipsis",
                  "padding-left": "0.5rem",
                }}
              />
            </Stack>
          </Stack>
        </Stack>
        {/* Connect Area */}
        <Stack padding="1rem" width="100%" borderBottomWidth="2px">
          <Text size="lg" fontWeight="bold">
            Connect
          </Text>
          <Stack direction="row" width="100%">
            <Stack width="50%">
              <Text size="sm" width="100%" color="fg.muted" marginTop="0.4rem">
                IP
              </Text>
              <Stack
                background="bg.muted"
                width="100%"
                borderRadius="0.5rem"
                height="2rem"
              >
                <input
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    outline: "none",
                    "white-space": "nowrap",
                    overflow: "hidden",
                    display: "block",
                    "text-overflow": "ellipsis",
                    "padding-left": "0.5rem",
                  }}
                />
              </Stack>
            </Stack>
            <Stack width="50%">
              <Text
                size="sm"
                width="100%"
                color="fg.muted"
                marginRight="0.5rem"
                marginTop="0.4rem"
              >
                Port
              </Text>
              <Stack
                background="bg.muted"
                width="100%"
                borderRadius="0.5rem"
                height="2rem"
              >
                <input
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    outline: "none",
                    "white-space": "nowrap",
                    overflow: "hidden",
                    display: "block",
                    "text-overflow": "ellipsis",
                    "padding-left": "0.5rem",
                  }}
                />
              </Stack>
            </Stack>
          </Stack>
          <Button>Connect</Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

export default Monitoring;
