pub const packages = struct {
    pub const @"122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f" = struct {
        pub const build_root = "C:\\Users\\PMF\\AppData\\Local\\zig\\p\\122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f";
        pub const build_zig = @import("122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
        };
    };
    pub const @"1220ecd4fd7d9240965aa1bb28822ebeb7c3f6188adeea04da1781fbce9ebe3de050" = struct {
        pub const build_root = "C:\\Users\\PMF\\AppData\\Local\\zig\\p\\1220ecd4fd7d9240965aa1bb28822ebeb7c3f6188adeea04da1781fbce9ebe3de050";
        pub const build_zig = @import("1220ecd4fd7d9240965aa1bb28822ebeb7c3f6188adeea04da1781fbce9ebe3de050");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
            .{ "webui", "122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f" },
        };
    };
};

pub const root_deps: []const struct { []const u8, []const u8 } = &.{
    .{ "zig-webui", "1220ecd4fd7d9240965aa1bb28822ebeb7c3f6188adeea04da1781fbce9ebe3de050" },
};
