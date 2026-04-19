/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  it("calls handler on meta+k", () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ "meta+k": handler }));

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls handler on ctrl+k", () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ "ctrl+k": handler }));

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call handler for non-matching key", () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ "meta+k": handler }));

    fireEvent.keyDown(document, { key: "j", metaKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it("handles shift modifier", () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ "shift+s": handler }));

    fireEvent.keyDown(document, { key: "s", shiftKey: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("handles multiple shortcuts independently", () => {
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    renderHook(() =>
      useKeyboardShortcuts({ "meta+k": handlerA, "ctrl+p": handlerB })
    );

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.keyDown(document, { key: "p", ctrlKey: true });

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it("removes listener on unmount — no calls after unmount", () => {
    const handler = jest.fn();
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ "meta+k": handler })
    );

    unmount();
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it("passes the native KeyboardEvent to the handler", () => {
    const handler = jest.fn();
    renderHook(() => useKeyboardShortcuts({ "escape": handler }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(handler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });
});
