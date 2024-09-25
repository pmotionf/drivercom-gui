const std = @import("std");
const webui = @import("webui");
const js = @import("zig-js");
const drivercon = @import("drivercon");
const yaml = @import("yaml");

//const html = @embedFile("config.html");
const html = @embedFile("Index.html");
const start_html = @embedFile("start.html");

var config: drivercon.Config = undefined;
var json: []u8 = undefined;

var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
const allocator = arena.allocator();

pub fn main() !void {
    defer arena.deinit();

    //config 파일을 json 형식으로 html에 전달
    const j = try std.json.stringifyAlloc(allocator, config, .{});
    defer allocator.free(j);
    json = try allocator.alloc(u8, j.len + 1);
    defer allocator.free(json);
    @memcpy(json[0..j.len], j);
    json[j.len] = 0;

    const win = webui.newWindow();

    _ = win.bind("showValue", showValue);
    _ = win.bind("saveValue", saveValue);
    _ = win.bind("selectFile", selectFile);

    _ = win.show(html);

    webui.wait();
    webui.clean();
}

fn showValue(e: webui.Event) void {
    const value = json[0 .. json.len - 1 :0];
    // const value = config;
    std.debug.print("Function called\n", .{});
    e.returnString(value);
}

fn saveValue(e: webui.Event) void {
    var response = std.mem.zeroes([64]u8);

    const win = e.getWindow();
    if (!win.script("return getValue();", 0, &response)) {
        std.debug.print("get value {s}", .{response});
    }
    std.debug.print("Get value: {s}\n", .{response});
}

//파일 선택 > 열기
fn selectFile(e: webui.Event) void {
    var response = std.mem.zeroes([64]u8);

    //선택한 파일 이름 받아오기
    const win = e.getWindow();
    if (!win.script("return fileName();", 0, &response)) {
        std.debug.print("{s}", .{response});
    }

    //파일 열기
    const file_name: []const u8 = removeZeros(response);
    fileOpen(file_name) catch |err| {
        std.log.err("{any}", .{err});
        return;
    };
    std.debug.print("{any}", .{config.id}); //>>테스트,  삭제 예정
}

//파일 열기
fn fileOpen(file_name: []const u8) !void {
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

    //config 파일을 json 형식으로 html에 전달
    allocator.free(json);
    const j = try std.json.stringifyAlloc(allocator, config, .{});
    defer allocator.free(j);
    allocator.free(json);
    json = try allocator.alloc(u8, j.len + 1);
    @memcpy(json[0..j.len], j);
    json[j.len] = 0;
}

//문자열에서 0제거하기
fn removeZeros(input: [64]u8) []u8 {
    var buffer: [64]u8 = undefined;
    var index: usize = 0;

    for (input) |char| {
        if (char != 0) {
            buffer[index] = char;
            index += 1;
        }
    }

    return buffer[0..index];
}

fn exit(_: webui.Event) void {
    // Close all opened windows
    webui.exit();
}
