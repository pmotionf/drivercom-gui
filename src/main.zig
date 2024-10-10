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

    _ = win.bind("sendJson", sendJson);

    _ = win.bind("sendDygraph", sendDygraph);
    _ = win.bind("sendSynchronizer", sendSynchronizer);

    _ = win.showBrowser(html, browser);

    webui.wait();
}

fn sendDygraph(e: *webui.Event) void {
    e.returnString(dygraph);
}

fn sendSynchronizer(e: webui.Event) void {
    e.returnString(synchronizer);
}

fn sendJson(e: webui.Event) void {
    const value = json[0 .. json.len - 1 :0];
    std.debug.print("download file\n", .{});
    e.returnString(value);
}

fn exit(_: *webui.Event) void {
    // Close all opened windows
    webui.exit();
}
