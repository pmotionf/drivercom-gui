#[tauri::command]
fn version() -> String {
    env!("CARGO_PKG_VERSION").into()
}

use ipnet::Ipv4Net;
use local_ip_address::local_ip;
use std::process::Command;

#[tauri::command]
fn kill_process(pid: u32) {
    if cfg!(target_os = "windows") {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string()])
            .spawn()
            .expect("Failed to kill process");
    } else if cfg!(target_os = "linux") {
        let _ = Command::new("kill")
            .args(["-SIGINT", &pid.to_string()])
            .spawn()
            .expect("Failed to kill process");
    }
}

#[tauri::command]
async fn get_server_addrs() -> Vec<String> {
    let mut results = vec![];

    let ip = match local_ip() {
        Ok(ip) => ip,
        Err(_) => return results,
    };
    let ipv4 = match ip {
        std::net::IpAddr::V4(v4) => v4,
        _ => return results,
    };

    // 16 is Magic number for detecting the last 2 ip address.
    // TODO: Understand what 16 means...
    let net = Ipv4Net::new(ipv4, 24).unwrap();

    for host in net.hosts() {
        results.push(host.to_string());
    }
    results
}

#[allow(clippy::missing_panics_doc)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_tcp::init())
        .invoke_handler(tauri::generate_handler![
            version,
            get_server_addrs,
            kill_process
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
