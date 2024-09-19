const std = @import("std");
const webui = @import("webui");
const js = @import("zig-js");
const drivercon = @import("drivercon");
const yaml = @import("yaml");

const html = @embedFile("config.html");
//const html = @embedFile("index.html");

var config: drivercon.Config = undefined;

pub fn main() !void {
    //yaml 파일 열기
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    var file = try std.fs.cwd().openFile("config.yml", .{});
    defer file.close();

    const file_text = try file.readToEndAlloc(allocator, 1_024_000_000);
    defer allocator.free(file_text);
    var untyped = try yaml.Yaml.load(
        allocator,
        file_text,
    );
    defer untyped.deinit();
    config = try untyped.parse(drivercon.Config);
    std.log.info("{}", .{config.station_id});

    const win = webui.newWindow();

    _ = win.bind("showValue", showValue);
    _ = win.bind("saveValue", saveValue);

    _ = win.show(html);

    webui.wait();
    webui.clean();
}

fn showValue(e: webui.Event) void {
    const value = config.id;
    std.debug.print("Function called\n", .{});
    e.returnValue(value);
}

fn saveValue(e: webui.Event) void {
    var response = std.mem.zeroes([64]u8);

    const win = e.getWindow();
    if (!win.script("return getValue();", 0, &response)) {
        std.debug.print("get value {s}", .{response});
    }
    std.debug.print("Get value: {s}\n", .{response});
}

fn exit(_: webui.Event) void {
    // Close all opened windows
    webui.exit();
}
