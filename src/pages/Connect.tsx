import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { Accordion } from "~/components/ui/accordion";
import { createSignal } from "solid-js";
import { Text } from "~/components/ui/text";
import { Box } from "styled-system/jsx";

function Connect() {
  //Items Dummy data
  const items = ["list1", "list2", "list3"];

  //리스트 갯수에 따른 버튼 관리
  const [statuses, setStatuses] = createSignal(
    Array(items.length).fill("연결하기"),
  );
  const [loading, setLoading] = createSignal(Array(items.length).fill(false));
  const [connecting, setConnecting] = createSignal(
    Array(items.length).fill("연결하시겠습니까?"),
  );

  //버튼클릭 기능
  const HandleClick = (index: number) => {
    setStatuses((prevStatuses) => {
      const newStatuses = [...prevStatuses];
      newStatuses[index] = "연결취소";
      //로딩바
      setLoading((prevLoading) => {
        const newLoading = [...prevLoading];
        newLoading[index] = true;
        return newLoading;
      });
      setConnecting((prevConnecting) => {
        const newConnecting = [...prevConnecting];
        newConnecting[index] = "연결중입니다";
        return newConnecting;
      });

      setTimeout(() => {
        setStatuses((prevStatuses) => {
          const currentStatuses = [...prevStatuses];
          //if(prevStatuses === 1) currentStatuses[index] = "failure"; else
          currentStatuses[index] = "완료";
          setLoading((prevLoading) => {
            const newLoading = [...prevLoading];
            newLoading[index] = false;
            return newLoading;
          });
          setConnecting((prevConnecting) => {
            const newConnecting = [...prevConnecting];
            newConnecting[index] = "연결되었습니다";
            return newConnecting;
          });

          return currentStatuses;
        });
      }, 2000);

      return newStatuses;
    });
  };

  //아이템에 있는 리스트 갯수에 따라 박스와 버튼 생성
  const ConnectionList = () => {
    return (
      <Accordion.Root multiple={true}>
        {items.map((item, index) => (
          <Accordion.Item value={item} ml={"16px"}>
            <Accordion.ItemTrigger>
              {item}
              <Accordion.ItemIndicator>
                <IconChevronDown />
              </Accordion.ItemIndicator>
            </Accordion.ItemTrigger>
            <Accordion.ItemContent>
              {connecting()[index]}
              {loading()[index] && <Spinner marginLeft={"8px"} />}
              <Button
                ml={"10"}
                onClick={() => HandleClick(index)}
                disabled={statuses()[index] === "완료"}
              >
                {statuses()[index]}
              </Button>
            </Accordion.ItemContent>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    );
  };

  return (
    <>
      <Text size="3xl" fontWeight="bold" margin={"20px"}>
        Connect
      </Text>
      <Box
        bg="accent.a2"
        p="4"
        borderRadius="l3"
        mt="6"
        height="100%"
        overflowY="auto"
      >
        <div id="container">{ConnectionList()}</div>
      </Box>
    </>
  );
}

export default Connect;
