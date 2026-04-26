import { render, screen, fireEvent } from "@testing-library/react";
import { ViewSelector } from "@/components/views/ViewSelector";
import type { ViewType } from "@/components/views/ViewSelector";

describe("ViewSelector", () => {
  const onViewChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it("renders all six view tabs", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);

    expect(screen.getByTestId("view-table")).toBeInTheDocument();
    expect(screen.getByTestId("view-kanban")).toBeInTheDocument();
    expect(screen.getByTestId("view-calendar")).toBeInTheDocument();
    expect(screen.getByTestId("view-gallery")).toBeInTheDocument();
    expect(screen.getByTestId("view-list")).toBeInTheDocument();
    expect(screen.getByTestId("view-timeline")).toBeInTheDocument();
  });

  it("highlights the active view with bg-gray-100 class", () => {
    render(<ViewSelector activeView="KANBAN" onViewChange={onViewChange} />);

    const kanbanBtn = screen.getByTestId("view-kanban");
    expect(kanbanBtn.className).toContain("bg-gray-100");

    const tableBtn = screen.getByTestId("view-table");
    expect(tableBtn.className).not.toContain("bg-gray-100");
  });

  it("calls onViewChange when Table is clicked", () => {
    render(<ViewSelector activeView="KANBAN" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-table"));
    expect(onViewChange).toHaveBeenCalledWith("TABLE");
  });

  it("calls onViewChange when Kanban is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-kanban"));
    expect(onViewChange).toHaveBeenCalledWith("KANBAN");
  });

  it("calls onViewChange when Calendar is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-calendar"));
    expect(onViewChange).toHaveBeenCalledWith("CALENDAR");
  });

  it("calls onViewChange when Gallery is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-gallery"));
    expect(onViewChange).toHaveBeenCalledWith("GALLERY");
  });

  it("calls onViewChange when List is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-list"));
    expect(onViewChange).toHaveBeenCalledWith("LIST");
  });

  it("calls onViewChange when Timeline is clicked", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByTestId("view-timeline"));
    expect(onViewChange).toHaveBeenCalledWith("TIMELINE");
  });

  it("shows correct label text for each view", () => {
    render(<ViewSelector activeView="TABLE" onViewChange={onViewChange} />);
    expect(screen.getByText("Tabla")).toBeInTheDocument();
    expect(screen.getByText("Kanban")).toBeInTheDocument();
    expect(screen.getByText("Calendario")).toBeInTheDocument();
    expect(screen.getByText("Galeria")).toBeInTheDocument();
    expect(screen.getByText("Lista")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  const views: ViewType[] = ["TABLE", "KANBAN", "CALENDAR", "GALLERY", "LIST", "TIMELINE"];
  views.forEach((view) => {
    it(`renders correctly with activeView=${view}`, () => {
      render(<ViewSelector activeView={view} onViewChange={onViewChange} />);
      const button = screen.getByTestId(`view-${view.toLowerCase()}`);
      expect(button.className).toContain("bg-gray-100");
    });
  });
});