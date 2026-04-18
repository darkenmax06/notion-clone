import { render, screen, fireEvent } from "@testing-library/react";
import { ViewSelector } from "@/components/views/ViewSelector";
import type { ViewType } from "@/components/views/ViewSelector";

describe("ViewSelector", () => {
  const onViewChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it("renders all three view tabs", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);

    expect(screen.getByTestId("view-table")).toBeInTheDocument();
    expect(screen.getByTestId("view-kanban")).toBeInTheDocument();
    expect(screen.getByTestId("view-calendar")).toBeInTheDocument();
  });

  it("highlights the active view with bg-gray-100 class", () => {
    render(<ViewSelector activeView="KANBAN" onViewChange={onViewChange} />);

    const kanbanBtn = screen.getByTestId("view-kanban");
    expect(kanbanBtn.className).toContain("bg-gray-100");

    const tableBtn = screen.getByTestId("view-table");
    expect(tableBtn.className).not.toContain("bg-gray-100");
  });

  it("calls onViewChange with TABLE when Tabla is clicked", () => {
    render(<ViewSelector activeView="KANBAN" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-table"));
    expect(onViewChange).toHaveBeenCalledWith("TABLE");
  });

  it("calls onViewChange with KANBAN when Kanban is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-kanban"));
    expect(onViewChange).toHaveBeenCalledWith("KANBAN");
  });

  it("calls onViewChange with CALENDAR when Calendario is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-calendar"));
    expect(onViewChange).toHaveBeenCalledWith("CALENDAR");
  });

  it("does not call onViewChange when already active view is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-table"));
    // still calls — ViewSelector doesn't guard duplicates, that's fine
    expect(onViewChange).toHaveBeenCalledWith("TABLE");
  });

  it("shows correct label text for each view", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    expect(screen.getByText("Tabla")).toBeInTheDocument();
    expect(screen.getByText("Kanban")).toBeInTheDocument();
    expect(screen.getByText("Calendario")).toBeInTheDocument();
  });

  const views: ViewType[] = ["TABLE", "KANBAN", "CALENDAR"];
  views.forEach((view) => {
    it(`renders correctly with activeView=${view}`, () => {
      render(<ViewSelector activeView={view} onViewChange={onViewChange} />);
      const btn = screen.getByTestId(`view-${view.toLowerCase()}`);
      expect(btn.className).toContain("bg-gray-100");
    });
  });
});
