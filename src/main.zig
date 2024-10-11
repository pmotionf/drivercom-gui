const builtin = @import("builtin");
const std = @import("std");

const args = @import("args");
const drivercom = @import("drivercom");
const webui = @import("webui");

const js = @import("js.zig");
const page = @import("page.zig");
const style = @import("style.zig");
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
            } else if (!win.showWv(page.@"index.html")) {
                continue :show_window .ChromiumBased;
            }
        },
        else => |b| {
            if (!win.showBrowser(page.@"index.html", b)) {
                switch (b) {
                    .ChromiumBased => {
                        continue :show_window .Firefox;
                    },
                    else => {
                        if (!win.showBrowser(page.@"index.html", b)) {
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

    const style_ti = @typeInfo(style).@"struct";
    inline for (style_ti.decls) |decl| {
        if (std.mem.eql(u8, "/style/" ++ decl.name, filename)) {
            const response = std.fmt.comptimePrint(header_templ, .{
                comptime filetype(decl.name),
                @field(style, decl.name).len,
                @field(style, decl.name),
            });
            return response;
        }
    }

    const js_ti = @typeInfo(js).@"struct";
    inline for (js_ti.decls) |decl| {
        if (std.mem.eql(u8, "/js/" ++ decl.name, filename)) {
            const response = std.fmt.comptimePrint(header_templ, .{
                comptime filetype(decl.name),
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
                comptime filetype(decl.name),
                @field(vendor, decl.name).len,
                @field(vendor, decl.name),
            });
            return response;
        }
    }

    // The page handler must always be at the end so that more precise URLs
    // are handled first.
    const page_ti = @typeInfo(page).@"struct";
    inline for (page_ti.decls) |decl| {
        if (std.mem.eql(u8, "/" ++ decl.name, filename)) {
            const response = std.fmt.comptimePrint(header_templ, .{
                comptime filetype(decl.name),
                @field(page, decl.name).len,
                @field(page, decl.name),
            });
            return response;
        }
    }

    // Special handling for index.
    if (filename.len == 0 or (filename.len == 1 and filename[0] == '/')) {
        const response = std.fmt.comptimePrint(header_templ, .{
            "html",
            page.@"index.html".len,
            page.@"index.html",
        });
        return response;
    }

    return null;
}

fn exit(_: *webui.Event) void {
    // Close all opened windows
    webui.exit();
}

fn filetype(comptime name: []const u8) []const u8 {
    const ext = comptime extension(name);
    return extensionToFileType(ext);
}

fn extension(comptime name: []const u8) []const u8 {
    var parts = std.mem.splitScalar(u8, name, '.');
    var result: []const u8 = "";
    while (parts.next()) |part| {
        if (part.len == 0) continue;
        result = part;
    }
    return result;
}

fn extensionToFileType(comptime ext: []const u8) []const u8 {
    if (std.mem.eql(u8, ext, "html") or
        std.mem.eql(u8, ext, "css"))
    {
        return ext;
    }
    if (std.mem.eql(u8, ext, "js")) {
        return "javascript";
    }
    unreachable;
}
