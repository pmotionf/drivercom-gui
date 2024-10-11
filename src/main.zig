const builtin = @import("builtin");
const std = @import("std");

const args = @import("args");
const drivercom = @import("drivercom");
const webui = @import("webui");

const html = @embedFile("index.html");
const dygraph = @embedFile("vendor/dygraph.min.js");
const synchronizer = @embedFile("vendor/synchronizer.js");

var config: drivercom.Config = undefined;
var json: []u8 = undefined;
var browser: webui.Browser = .Webview;

pub const Options = struct {
    browser: webui.Browser = .Webview,

    pub const meta = .{
        .full_text = "PMF Smart Driver connection graphical utility.",
        .usage_summary = "[--browser]",

        .option_docs = .{
            .browser = "choose GUI browser, defaults to Webview",
        },
    };
};

pub fn main() !void {
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const allocator = arena.allocator();

    const options = try args.parseForCurrentProcess(
        Options,
        allocator,
        .print,
    );
    inline for (std.meta.fields(@TypeOf(options.options))) |fld| {
        if (comptime std.mem.eql(u8, "browser", fld.name)) {
            browser = @field(options.options, fld.name);
        }
    }

    //config 파일을  json 형식으로 html에 전달
    const j = try std.json.stringifyAlloc(allocator, config, .{});
    defer allocator.free(j);
    json = try allocator.alloc(u8, j.len + 1);
    defer allocator.free(json);
    @memcpy(json[0..j.len], j);
    json[j.len] = 0;

    const win = webui.newWindow();
    defer webui.clean();
    win.setFileHandler(my_files_handler);

    _ = win.bind("sendJson", sendJson);

    show_window: switch (browser) {
        .Webview => {
            if (comptime builtin.target.os.tag == .windows) {
                // WebView not supported on Windows until
                // https://github.com/webui-dev/webui/issues/496
                continue :show_window .ChromiumBased;
            } else if (!win.showWv(html)) {
                continue :show_window .ChromiumBased;
            }
        },
        else => |b| {
            if (!win.showBrowser(html, b)) {
                switch (b) {
                    .ChromiumBased => {
                        continue :show_window .Firefox;
                    },
                    else => {
                        if (!win.showBrowser(html, b)) {
                            return error.BrowserConnectionFailed;
                        }
                    },
                }
            }
        },
    }

    webui.wait();
}

fn sendJson(e: *webui.Event) void {
    const value = json[0 .. json.len - 1 :0];
    std.debug.print("download file\n", .{});
    e.returnString(value);
}
//파일 추가
fn my_files_handler(filename: []const u8) ?[]const u8 {
    const st = "HTTP/1.1 200 OK\nContent-Type: text/html\nContent-Length: {}\n\n{s}";
    if (std.mem.eql(u8, filename, "/script.js")) {
        const script = @embedFile("js/script.js");
        const response = std.fmt.comptimePrint(st, .{ script.len, script });
        return response;
    } else if (std.mem.eql(u8, filename, "/chart.js")) {
        const script = @embedFile("js/chart.js");
        const response = std.fmt.comptimePrint(st, .{ script.len, script });
        return response;
    } else if (std.mem.eql(u8, filename, "/config.js")) {
        const script = @embedFile("js/config.js");
        const response = std.fmt.comptimePrint(st, .{ script.len, script });
        return response;
    } else if (std.mem.eql(u8, filename, "/newConfig.js")) {
        const script = @embedFile("js/newConfig.js");
        const response = std.fmt.comptimePrint(st, .{ script.len, script });
        return response;
    } else if (std.mem.eql(u8, filename, "/dygraph.min.js")) {
        const script = @embedFile("vendor/dygraph.min.js");
        const response = std.fmt.comptimePrint(st, .{ script.len, script });
        return response;
    } else if (std.mem.eql(u8, filename, "/synchronizer.js")) {
        const script = @embedFile("vendor/synchronizer.js");
        const response = std.fmt.comptimePrint(st, .{ script.len, script });
        return response;
    }

    return null;
}

fn exit(_: *webui.Event) void {
    // Close all opened windows
    webui.exit();
}
