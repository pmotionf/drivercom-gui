import { createEffect, onMount } from "solid-js";
import { Button } from "~/components/ui/styled/button.tsx";
import net from "node:net";

function Monitoring() {
  onMount(() => {
    const client = new net.Socket();
    const host = "192.168.0.7";
    const port = 9001;

    client.connect(port, host, () => {
      console.log("test");
      client.write("Hello, server! Love, Client.");
    });
  });

  /*load("all.proto", function (err, root) {
    if (err) {
      console.log(err);
      throw err;
    }

    const connect = root?.lookupType("SendCommand.GetX");
    let message = connect?.create({ line_idx: "left", axis_idx: 1 });
    let buffer = connect?.encode(message!).finish();
    let decoded = connect?.decode(buffer!);
    });*/

  return (
    <>
      <Button>test</Button>
    </>
  );
}

export default Monitoring;
