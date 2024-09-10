const std = @import("std");
const webui = @import("webui");
const drivercon = @import("drivercon");

pub fn main() !void {
    var win = webui.newWindow();
    _ = win.show("<html><script src=\"webui.js\"></script> Hello World from Zig! </html>");
    webui.wait();
}
