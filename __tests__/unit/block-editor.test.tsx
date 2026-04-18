/**
 * Tests for BlockEditor — mocks BlockNote to isolate autosave/debounce logic.
 */

let capturedOnChange: (() => void) | null = null;

const mockEditorDocument = [
  {
    type: "paragraph",
    content: [{ type: "text", text: "Hola mundo" }],
  },
];

jest.mock("@blocknote/react", () => ({
  useCreateBlockNote: jest.fn(() => ({ document: mockEditorDocument })),
}));

jest.mock("@blocknote/mantine", () => ({
  // Capture the onChange callback so tests can trigger it manually
  BlockNoteView: jest.fn(
    ({ onChange }: { editor: unknown; onChange: () => void; theme?: string }) => {
      capturedOnChange = onChange;
      return <div data-testid="blocknote-view" />;
    }
  ),
}));

jest.mock("@/lib/actions/pages", () => ({
  updatePage: jest.fn().mockResolvedValue({ success: true, page: {} }),
}));

// CSS import stub (next/jest auto-stubs CSS, but explicit here for clarity)
jest.mock("@blocknote/mantine/style.css", () => ({}), { virtual: true });

import React from "react";
import { render, act } from "@testing-library/react";
import BlockEditor from "@/components/editor/BlockEditor";
import { updatePage } from "@/lib/actions/pages";

const mockUpdatePage = updatePage as jest.Mock;

describe("BlockEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    capturedOnChange = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the BlockNoteView", () => {
    const { getByTestId } = render(<BlockEditor pageId="page1" />);
    expect(getByTestId("blocknote-view")).toBeInTheDocument();
  });

  it("does NOT call updatePage before debounce delay elapses", async () => {
    render(<BlockEditor pageId="page1" />);
    act(() => {
      capturedOnChange?.();
    });
    // Advance only 500ms — less than the 1000ms debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockUpdatePage).not.toHaveBeenCalled();
  });

  it("calls updatePage after the 1000ms debounce delay", async () => {
    render(<BlockEditor pageId="page1" />);
    act(() => {
      capturedOnChange?.();
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockUpdatePage).toHaveBeenCalledTimes(1);
    expect(mockUpdatePage).toHaveBeenCalledWith(
      expect.objectContaining({ id: "page1", content: mockEditorDocument })
    );
  });

  it("resets debounce timer on rapid successive changes (only saves once)", async () => {
    render(<BlockEditor pageId="page1" />);
    // Fire three rapid changes
    act(() => { capturedOnChange?.(); });
    act(() => { jest.advanceTimersByTime(400); capturedOnChange?.(); });
    act(() => { jest.advanceTimersByTime(400); capturedOnChange?.(); });
    // Total time passed: 800ms — still within last debounce window
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    // Only one save despite three onChange calls
    expect(mockUpdatePage).toHaveBeenCalledTimes(1);
  });

  it("does not save again if content hasn't changed since last save", async () => {
    render(<BlockEditor pageId="page1" />);

    // First change + save
    act(() => { capturedOnChange?.(); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockUpdatePage).toHaveBeenCalledTimes(1);

    // Same content triggers onChange again — should NOT re-save
    act(() => { capturedOnChange?.(); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockUpdatePage).toHaveBeenCalledTimes(1);
  });

  it("extracts title from first block and passes it to updatePage", async () => {
    render(<BlockEditor pageId="page1" />);
    act(() => { capturedOnChange?.(); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockUpdatePage).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Hola mundo" })
    );
  });

  it("calls onTitleChange callback when title is extracted", async () => {
    const onTitleChange = jest.fn();
    render(<BlockEditor pageId="page1" onTitleChange={onTitleChange} />);
    act(() => { capturedOnChange?.(); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(onTitleChange).toHaveBeenCalledWith("Hola mundo");
  });

  it("passes initialContent to useCreateBlockNote", () => {
    const { useCreateBlockNote } = require("@blocknote/react");
    const initialContent = [{ type: "heading", content: [] }];
    render(<BlockEditor pageId="p1" initialContent={initialContent as never} />);
    expect(useCreateBlockNote).toHaveBeenCalledWith(
      expect.objectContaining({ initialContent })
    );
  });
});
