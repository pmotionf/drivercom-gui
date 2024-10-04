const std = @import("std");
const webui = @import("webui");
const js = @import("zig-js");
const drivercom = @import("drivercom");
const yaml = @import("yaml");

//const html = @embedFile("config.html");
const html = @embedFile("Index.html");
const start_html = @embedFile("start.html");

const chartjs = @embedFile("chart.js");
const chartjs_plugin = @embedFile("chartjs-plugin-zoom.min.js");

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
    _ = win.bind("sendChartjs", sendChartjs);
    _ = win.bind("sendChartjsPlugin", sendChartjsPlugin);
    _ = win.show(html);

    webui.wait();
    webui.clean();
}

fn sendChartjs(e: webui.Event) void {
    e.returnString(chartjs);
}

fn sendChartjsPlugin(e: webui.Event) void {
    e.returnString(chartjs_plugin);
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
