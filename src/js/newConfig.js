function ready() {
    if (typeof webui !== "undefined") {
      webui.setEventCallback((e) => {
        if (e == webui.event.CONNECTED) {
          webui.call("sendJson").then((response) => {
            const dict = JSON.parse(response);
            appendTable(dict);
          });
        }
      });
    }
  }

  function appendTable(dict, keys = "") {
    const t_body = document.getElementById("table");
    for (let key in dict) {
      if (typeof dict[key] == "object") {
        const k = keys + "_" + key;
        const row = document.createElement("tr");
        const header = document.createElement("th");
        header.colSpan = "2";
        header.className = "section-header";
        header.textContent = key;
        row.appendChild(header);
        t_body.appendChild(row);
        appendTable(dict[key], k);
      } else {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        const inputCell = document.createElement("td");
        const inputField = document.createElement("input");

        nameCell.textContent = key; // 이름(키) 추가
        if (keys.includes("flags") || key == "flags") {
          inputField.type = "checkbox"; // 입력 타입 설정
        } else {
          inputField.type = "number"; // 입력 타입 설정
        }

        inputField.name = key;
        inputField.id = keys + "_" + key;
        inputField.style.width = "200px";
        inputField.style.padding = "3px";
        inputCell.appendChild(inputField); // 입력 필드 추가

        row.appendChild(nameCell);
        row.appendChild(inputCell);
        t_body.appendChild(row);
      }
    }
  }
  document.addEventListener("DOMContentLoaded", ready);