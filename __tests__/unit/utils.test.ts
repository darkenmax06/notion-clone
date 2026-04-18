import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("merges multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves tailwind conflicts — last wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("filters falsy values", () => {
    expect(cn("a", false && "b", null, undefined, "c")).toBe("a c");
  });

  it("handles conditional object syntax", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe("text-red-500");
  });

  it("returns empty string when no valid inputs", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("deduplicates identical classes", () => {
    const result = cn("flex", "flex");
    expect(result).toBe("flex");
  });
});
