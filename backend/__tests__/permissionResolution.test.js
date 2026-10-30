const { checkPermission, canDecideReceivingCondition } = require("../middleware/Authmiddleware");

// checkPermission needs no DB access — it only ever reads req.user, which
// authmiddleware populates upstream (including req.user.jobFunctions,
// fetched once at auth time). These are pure unit tests of that
// resolution logic: role base vs. job-function narrowing/expansion.

const runCheck = (resource, action, user) => {
  const req = { user };
  let statusCode = null;
  let body = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  checkPermission(resource, action)(req, res, next);
  return { allowed: nextCalled, statusCode, body };
};

describe("checkPermission — job function tags narrow or expand, never bypass role identity", () => {
  test("untagged staff keeps today's default role access unchanged", () => {
    const user = { role: "staff", jobFunctions: [] };
    expect(runCheck("receiving", "write", user).allowed).toBe(true);
    expect(runCheck("fulfillment", "write", user).allowed).toBe(true);
    expect(runCheck("supplier", "write", user).allowed).toBe(false); // staff base is read-only
  });

  test("a staff member tagged 'inbound' loses fulfillment access", () => {
    const user = { role: "staff", jobFunctions: ["inbound"] };
    expect(runCheck("receiving", "write", user).allowed).toBe(true);
    expect(runCheck("fulfillment", "read", user).allowed).toBe(false);
  });

  test("a staff member tagged 'procurement' gains supplier write beyond the staff base", () => {
    const user = { role: "staff", jobFunctions: ["procurement"] };
    const result = runCheck("supplier", "write", user);
    expect(result.allowed).toBe(true);
  });

  test("a staff member tagged 'audit' is locked to read-only on sales, even though staff can normally write", () => {
    const user = { role: "staff", jobFunctions: ["audit"] };
    expect(runCheck("sales", "read", user).allowed).toBe(true);
    expect(runCheck("sales", "write", user).allowed).toBe(false);
  });

  test("multiple tags union their allowances for a mentioned resource", () => {
    const user = { role: "staff", jobFunctions: ["inbound", "quality"] };
    expect(runCheck("receiving", "write", user).allowed).toBe(true);
  });

  test("a resource no assigned tag mentions is denied, even though the plain role would allow it", () => {
    const user = { role: "staff", jobFunctions: ["inbound"] };
    // "inbound" doesn't mention sales at all — tags fully replace the role
    // default once assigned, so this must NOT silently inherit staff's
    // normal sales access. Otherwise a narrow floor tag like "inbound"
    // wouldn't actually be exclusive.
    expect(runCheck("sales", "write", user).allowed).toBe(false);
  });

  test("admin and super_admin are never narrowed, even if a tag is somehow present", () => {
    const admin = { role: "admin", jobFunctions: ["audit"] };
    expect(runCheck("sales", "write", admin).allowed).toBe(true);

    const superAdmin = { role: "super_admin", jobFunctions: ["audit"] };
    expect(runCheck("sales", "delete", superAdmin).allowed).toBe(true);
  });

  test("a resource missing from both the role base and any tag is denied", () => {
    const user = { role: "staff", jobFunctions: ["inbound"] };
    expect(runCheck("category", "read", user).allowed).toBe(false);
  });
});

describe("canDecideReceivingCondition — segregates the damaged/rejected/quarantine call", () => {
  test("untagged staff is unrestricted (today's behavior)", () => {
    expect(canDecideReceivingCondition({ role: "staff", jobFunctions: [] })).toBe(true);
  });

  test("a staff member tagged only 'inbound' cannot decide quality outcomes", () => {
    expect(canDecideReceivingCondition({ role: "staff", jobFunctions: ["inbound"] })).toBe(false);
  });

  test("a staff member tagged 'quality' can decide quality outcomes", () => {
    expect(
      canDecideReceivingCondition({ role: "staff", jobFunctions: ["inbound", "quality"] }),
    ).toBe(true);
  });

  test("manager/admin/super_admin can always decide, regardless of tags", () => {
    expect(canDecideReceivingCondition({ role: "manager", jobFunctions: [] })).toBe(true);
    expect(canDecideReceivingCondition({ role: "admin", jobFunctions: [] })).toBe(true);
    expect(canDecideReceivingCondition({ role: "super_admin", jobFunctions: [] })).toBe(true);
  });
});
