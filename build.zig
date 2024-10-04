const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "SHDrv-server",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(exe);

    const zig_webui = b.dependency("zig-webui", .{
        .target = target,
        .optimize = optimize,
        .enable_tls = false, // whether enable tls support
        .is_static = true, // whether static link
    });
    // add module
    exe.root_module.addImport("webui", zig_webui.module("webui"));

    const drivercom = b.dependency("drivercom", .{
        .target = target,
        .optimize = optimize,
        .cli = false,
    });
    exe.root_module.addImport("drivercom", drivercom.module("drivercom"));

    const yaml = b.dependency("yaml", .{
        .target = target,
        .optimize = optimize,
    });
    exe.root_module.addImport("yaml", yaml.module("yaml"));

    const zig_js = b.dependency("zig-js", .{
        .target = target,
        .optimize = optimize,
    });
    exe.root_module.addImport("zig-js", zig_js.module("zig-js"));

    const run_cmd = b.addRunArtifact(exe);

    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    const exe_unit_tests = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    const run_exe_unit_tests = b.addRunArtifact(exe_unit_tests);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_exe_unit_tests.step);
}
