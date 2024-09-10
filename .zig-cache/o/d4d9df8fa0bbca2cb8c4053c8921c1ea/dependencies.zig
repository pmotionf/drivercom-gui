pub const packages = struct {
    pub const @"12201954213be69028a7ac9c0c8e5bbd18702ac0d4d0dc697bbe881b803a80576bdd" = struct {
        pub const build_root = "C:\\Users\\PMF\\AppData\\Local\\zig\\p\\12201954213be69028a7ac9c0c8e5bbd18702ac0d4d0dc697bbe881b803a80576bdd";
        pub const build_zig = @import("12201954213be69028a7ac9c0c8e5bbd18702ac0d4d0dc697bbe881b803a80576bdd");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
            .{ "serial", "12205e634eedafca1d9275bab13b0b549dbc8a941136e9ed14564ea4f65126dd88a0" },
            .{ "args", "122098c4dac1fe09c33ad4f0ffca362a3731096d5245e53b1c6b533867ce2582a7bd" },
            .{ "yaml", "12208398e1393f83a39d03f3ef4893607650b6227dc7f1eee3db4d163fbc2c0c37ca" },
        };
    };
    pub const @"12205e634eedafca1d9275bab13b0b549dbc8a941136e9ed14564ea4f65126dd88a0" = struct {
        pub const available = false;
    };
    pub const @"12208398e1393f83a39d03f3ef4893607650b6227dc7f1eee3db4d163fbc2c0c37ca" = struct {
        pub const available = false;
    };
    pub const @"122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f" = struct {
        pub const build_root = "C:\\Users\\PMF\\AppData\\Local\\zig\\p\\122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f";
        pub const build_zig = @import("122088eb8bdc74d983f96cc4a4f1ad80b1d78cdbb60b302047c40557bae95cc3c24f");
        pub const deps: []const struct { []const u8, []const u8 } = &.{
        };
    };
    pub const @"122098c4dac1fe09c33ad4f0ffca362a3731096d5245e53b1c6b533867ce2582a7bd" = struct {
        pub const available = false;
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
    .{ "drivercon", "12201954213be69028a7ac9c0c8e5bbd18702ac0d4d0dc697bbe881b803a80576bdd" },
};
