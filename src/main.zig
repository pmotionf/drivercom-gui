const builtin = @import("builtin");
const std = @import("std");

const args = @import("args");
const drivercom = @import("drivercom");
const webui = @import("webui");

const index = @embedFile("index.html");
const js = @import("js.zig");
const vendor = @import("vendor.zig");

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

fn file_handler(filename: []const u8) ?[]const u8 {
    const header_templ =
        "HTTP/1.1 200 OK\nContent-Type: text/{s}\nContent-Length: {}\n\n{s}";

    const js_ti = @typeInfo(js).@"struct";
    inline for (js_ti.decls) |decl| {
        if (std.mem.eql(u8, "/js/" ++ decl.name, filename)) {
            const response = std.fmt.comptimePrint(header_templ, .{
                "javascript",
                @field(js, decl.name).len,
                @field(js, decl.name),
            });
            return response;
        }
    }

    const vendor_ti = @typeInfo(vendor).@"struct";
    inline for (vendor_ti.decls) |decl| {
        if (std.mem.eql(u8, "/vendor/" ++ decl.name, filename)) {
            const response = std.fmt.comptimePrint(header_templ, .{
                "javascript",
                @field(vendor, decl.name).len,
                @field(vendor, decl.name),
            });
            return response;
        }
    }

    return null;
}

fn exit(_: *webui.Event) void {
    // Close all opened windows
    webui.exit();
}
