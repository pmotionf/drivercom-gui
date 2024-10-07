const std = @import("std");
const webui = @import("webui");
const drivercom = @import("drivercom");

//const html = @embedFile("config.html");
const html = @embedFile("index.html");

const dygraph = @embedFile("vendor/dygraph.min.js");

var config: drivercom.Config = undefined;
var json: []u8 = undefined;

var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
const allocator = arena.allocator();

pub fn main() !void {
    defer arena.deinit();

    //config 파일을  json 형식으로 html에 전달
    const j = try std.json.stringifyAlloc(allocator, config, .{});
    defer allocator.free(j);
    json = try allocator.alloc(u8, j.len + 1);
    defer allocator.free(json);
    @memcpy(json[0..j.len], j);
    json[j.len] = 0;

    const win = webui.newWindow();

    _ = win.bind("sendJson", sendJson);
    _ = win.bind("sendDygraph", sendDygraph);
    _ = win.show(html);

    webui.wait();
    webui.clean();
}

fn sendDygraph(e: webui.Event) void {
    e.returnString(dygraph);
}

fn sendJson(e: webui.Event) void {
    const value = json[0 .. json.len - 1 :0];
    std.debug.print("download file\n", .{});
    e.returnString(value);
}

fn exit(_: webui.Event) void {
    // Close all opened windows
    webui.exit();
}
