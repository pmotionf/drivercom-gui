#[tauri::command]
fn version() -> String {
    env!("CARGO_PKG_VERSION").into()
}

use ipnet::Ipv4Net;
use local_ip_address::local_ip;

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

use std::net::{IpAddr, SocketAddr};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

async fn scan_port(addr: IpAddr, port: u16) -> Option<u16> {
    let socket_address = SocketAddr::new(addr, port);
    // Attempt to connect with a 1-second timeout
    match timeout(Duration::from_secs(1), TcpStream::connect(socket_address)).await {
        Ok(Ok(_)) => Some(port), // Connection successful
        _ => None,               // Connection failed or timed out
    }
}

#[tauri::command]
async fn get_ports(ip: String) -> Vec<String> {
    let ip_str = ip; // Replace with your target IP
    let ip_addr: IpAddr = ip_str.parse().expect("Invalid IP address");
    let start_port = 1;
    let end_port = 65535; // Define your port range

    let mut tasks = vec![];
    for port in start_port..=end_port {
        let task = tokio::spawn(async move { scan_port(ip_addr, port).await });
        tasks.push(task);
    }

    let mut open_ports = vec![];
    for task in tasks {
        if let Some(port) = task.await.expect("Task failed") {
            open_ports.push(port.to_string());
        }
    }

    open_ports
}

#[allow(clippy::missing_panics_doc)]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_tcp::init())
        .plugin(tauri_plugin_pty::init())
        .invoke_handler(tauri::generate_handler![
            version,
            get_server_addrs,
            get_ports
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
