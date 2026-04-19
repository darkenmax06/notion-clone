/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SearchModal from "@/components/search/SearchModal";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockSearchResponse(pages = [], databases = []) {
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ pages, databases }),
  } as Response);
}

describe("SearchModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSearchResponse();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("is hidden by default — input not in DOM", () => {
    render(<SearchModal />);
    expect(screen.queryByPlaceholderText(/Buscar/i)).not.toBeInTheDocument();
  });

  it("opens when meta+k is pressed", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it("opens when ctrl+k is pressed", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/Buscar/i)).toBeInTheDocument();
  });

  it("closes when X button is clicked", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const closeBtn = screen.getByLabelText(/Cerrar búsqueda/i);
    fireEvent.click(closeBtn);
    expect(screen.queryByPlaceholderText(/Buscar/i)).not.toBeInTheDocument();
  });

  it("closes when backdrop is clicked", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    // The backdrop is the outer div
    const backdrop = document.querySelector(".fixed.inset-0");
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.queryByPlaceholderText(/Buscar/i)).not.toBeInTheDocument();
  });

  it("shows empty state hint when no query", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByText(/Empieza a escribir/i)).toBeInTheDocument();
  });

  it("fetches results after typing 2+ characters", async () => {
    mockSearchResponse(
      [{ id: "p1", title: "Inicio", icon: "🏠" }],
      []
    );

    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });

    const input = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(input, { target: { value: "In" } });

    act(() => { jest.advanceTimersByTime(250); });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/search?q=In")
      );
    });
  });

  it("does not fetch for single character queries", () => {
    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const input = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(input, { target: { value: "a" } });

    act(() => { jest.advanceTimersByTime(250); });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows page results when returned", async () => {
    mockSearchResponse([{ id: "p1", title: "Notas de trabajo", icon: "📝" }], []);

    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), {
      target: { value: "Notas" },
    });

    act(() => { jest.advanceTimersByTime(250); });

    await waitFor(() => {
      expect(screen.getByText("Notas de trabajo")).toBeInTheDocument();
    });
  });

  it("shows database results when returned", async () => {
    mockSearchResponse([], [{ id: "d1", title: "Tareas", icon: "✅" }]);

    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), {
      target: { value: "Tareas" },
    });

    act(() => { jest.advanceTimersByTime(250); });

    await waitFor(() => {
      expect(screen.getByText("Tareas")).toBeInTheDocument();
    });
  });

  it("shows 'Sin resultados' when search returns empty", async () => {
    mockSearchResponse([], []);

    render(<SearchModal />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), {
      target: { value: "xyz" },
    });

    act(() => { jest.advanceTimersByTime(250); });

    await waitFor(() => {
      expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument();
    });
  });
});
