const builtin = @import("builtin");
const std = @import("std");

const args = @import("args");
const drivercom = @import("drivercom");
const webui = @import("webui");

const index = @embedFile("index.html");
const vendor = @import("vendor.zig");
const js = @import("js.zig");

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
    win.setFileHandler(file_handler);

    _ = win.bind("sendJson", sendJson);

    show_window: switch (browser) {
        .Webview => {
            if (comptime builtin.target.os.tag == .windows) {
                // WebView not supported on Windows until
                // https://github.com/webui-dev/webui/issues/496
                continue :show_window .ChromiumBased;
            } else if (!win.showWv(index)) {
                continue :show_window .ChromiumBased;
            }
        },
        else => |b| {
            if (!win.showBrowser(index, b)) {
                switch (b) {
                    .ChromiumBased => {
                        continue :show_window .Firefox;
                    },
                    else => {
                        if (!win.showBrowser(index, b)) {
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
    e.returnString(value);
}
//파일 추가
fn file_handler(filename: []const u8) ?[]const u8 {
    const header_templ =
        "HTTP/1.1 200 OK\nContent-Type: text/html\nContent-Length: {}\n\n{s}";
    if (std.mem.eql(u8, filename, "/js/chart.js")) {
        const response = std.fmt.comptimePrint(
            header_templ,
            .{ js.chart.len, js.chart },
        );
        return response;
    } else if (std.mem.eql(u8, filename, "/js/config.js")) {
        const response = std.fmt.comptimePrint(
            header_templ,
            .{ js.config.len, js.config },
        );
        return response;
    } else if (std.mem.eql(u8, filename, "/js/new_config.js")) {
        const response = std.fmt.comptimePrint(
            header_templ,
            .{ js.new_config.len, js.new_config },
        );
        return response;
    } else if (std.mem.eql(u8, filename, "/vendor/dygraph.min.js")) {
        const response = std.fmt.comptimePrint(
            header_templ,
            .{ vendor.dygraph.len, vendor.dygraph },
        );
        return response;
    } else if (std.mem.eql(u8, filename, "/vendor/synchronizer.js")) {
        const response = std.fmt.comptimePrint(
            header_templ,
            .{ vendor.synchronizer.len, vendor.synchronizer },
        );
        return response;
    }

    return null;
}

fn exit(_: *webui.Event) void {
    // Close all opened windows
    webui.exit();
}
