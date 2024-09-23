const std = @import("std");
const webui = @import("webui");
const js = @import("zig-js");
const drivercon = @import("drivercon");
const yaml = @import("yaml");

//const html = @embedFile("config.html");
const html = @embedFile("Index.html");
const start_html = @embedFile("start.html");

var config: drivercon.Config = undefined;

fn fileOpen(allocator: std.mem.Allocator, file_name: []const u8) !void {
    var file = try std.fs.cwd().openFile(file_name, .{});
    defer file.close();

    const file_text = try file.readToEndAlloc(allocator, 1_024_000_000);
    defer allocator.free(file_text);
    var untyped = try yaml.Yaml.load(
        allocator,
        file_text,
    );
    defer untyped.deinit();
    config = try untyped.parse(drivercon.Config);
}

pub fn main() !void {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    //yaml 파일 열기
    try fileOpen(allocator, "config.yml");

    std.log.info("{}", .{config.station_id});
    const info = @typeInfo(drivercon.Config).@"struct".fields;

    inline for (info, 0..) |con, i| {
        const value = @field(config, info[i].name);

        std.debug.print("{s} : {any} \n", .{ con.name, value });
    }

    //디렉토리 읽어오기
    const cwd = std.fs.cwd();
    var dir = try cwd.openDir(".", .{ .iterate = true });
    defer dir.close();
    var iterate = dir.iterate();

    var file_names = std.ArrayList([]const u8).init(allocator);
    defer file_names.deinit();

    while (try iterate.next()) |next_entry| {
        if (std.mem.endsWith(u8, next_entry.name, ".yml")) {
            try file_names.append(next_entry.name);
            std.debug.print("\nname : {s}", .{next_entry.name});
        }
    }
    std.debug.print("\nfiles : {s}", .{file_names.items});

    const win = webui.newWindow();

    _ = win.bind("showValue", showValue);
    _ = win.bind("saveValue", saveValue);

    _ = win.show(start_html);

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
