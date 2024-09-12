const std = @import("std");
const webui = @import("webui");
const drivercon = @import("drivercon");
const yaml = @import("yaml");

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

    const config = try untyped.parse(drivercon.Config);
    std.debug.print("{}", .{config});

    var win = webui.newWindow();

    // HTML 코드 정의
    const html_code =
        "<!DOCTYPE html>\n" ++
        "<html lang=\"ko\">\n" ++
        "<head>\n" ++
        "    <meta charset=\"UTF-8\">\n" ++
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" ++
        "    <title>Form Table Example</title>\n" ++
        "    <style>\n" ++
        "        table {\n" ++
        "            width: 80%;\n" ++
        "            border-collapse: collapse;\n" ++
        "        }\n" ++
        "        table, th, td {\n" ++
        "            border: 1px solid black;\n" ++
        "        }\n" ++
        "        th, td {\n" ++
        "            padding: 10px;\n" ++
        "            text-align: left;\n" ++
        "        }\n" ++
        "        input[type=\"text\"] {\n" ++
        "            width: 100%;\n" ++
        "            box-sizing: border-box;\n" ++
        "        }\n" ++
        "        .save-button {\n" ++
        "            margin-top: 20px;\n" ++
        "            text-align: center;\n" ++
        "        }\n" ++
        "        button {\n" ++
        "            padding: 10px 40px;\n" ++
        "            font-size: 16px;\n" ++
        "        }\n" ++
        "    </style>\n" ++
        "</head>\n" ++
        "<body>\n" ++
        "    <table>\n" ++
        "        <tr><td>ID</td><td><input type=\"text\" name=\"ID\"></td></tr>\n" ++
        "        <tr><td>Station_ID</td><td><input type=\"text\" name=\"Station_ID\"></td></tr>\n" ++
        "        <tr><td>Flags</td><td><input type=\"text\" name=\"Flags\"></td></tr>\n" ++
        "        <tr><td>Magnet_Pitch</td><td><input type=\"text\" name=\"Magnet_Pitch\"></td></tr>\n" ++
        "        <tr><td>Magnet_Length</td><td><input type=\"text\" name=\"Magnet_Length\"></td></tr>\n" ++
        "        <tr><td>vehicle_mass</td><td><input type=\"text\" name=\"vehicle_mass\"></td></tr>\n" ++
        "        <tr><td>mechanical_angle_offset</td><td><input type=\"text\" name=\"mechanical_angle_offset\"></td></tr>\n" ++
        "        <tr><td>axis_length</td><td><input type=\"text\" name=\"axis_length\"></td></tr>\n" ++
        "        <tr><td>motor_length</td><td><input type=\"text\" name=\"motor_length\"></td></tr>\n" ++
        "        <tr><td>calibrated_home_position</td><td><input type=\"text\" name=\"calibrated_home_position\"></td></tr>\n" ++
        "        <tr><td>total_axes</td><td><input type=\"text\" name=\"total_axes\"></td></tr>\n" ++
        "        <tr><td>warmup_voltage_reference</td><td><input type=\"text\" name=\"warmup_voltage_reference\"></td></tr>\n" ++
        "        <tr><td>calibration_magnet_length_Backward</td><td><input type=\"text\" name=\"calibration_magnet_length_Backward\"></td></tr>\n" ++
        "        <tr><td>calibration_magnet_length_Forward</td><td><input type=\"text\" name=\"calibration_magnet_length_Forward\"></td></tr>\n" ++
        "        <tr><td>Vdc_Target</td><td><input type=\"text\" name=\"Vdc_Target\"></td></tr>\n" ++
        "        <tr><td>Vdc_Limit_lower</td><td><input type=\"text\" name=\"Vdc_Limit_lower\"></td></tr>\n" ++
        "        <tr><td>Vdc_Limit_upper</td><td><input type=\"text\" name=\"Vdc_Limit_upper\"></td></tr>\n" ++
        "        <tr><td>axes</td><td><input type=\"text\" name=\"axes\"></td></tr>\n" ++
        "        <tr><td>hall_sensor</td><td><input type=\"text\" name=\"hall_sensor\"></td></tr>\n" ++
        "    </table>\n" ++
        "    <div class=\"save-button\">\n" ++
        "        <button type=\"button\">save</button>\n" ++
        "    </div>\n" ++
        "</body>\n" ++
        "</html>\n";

    _ = win.show(html_code);
    //_ = win.showWv(html_code);
    webui.wait();
}
