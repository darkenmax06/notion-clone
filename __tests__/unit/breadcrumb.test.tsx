import { render, screen } from "@testing-library/react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";

const three: BreadcrumbItem[] = [
  { id: "1", title: "Inicio", icon: "🏠" },
  { id: "2", title: "Proyectos", icon: "🚀" },
  { id: "3", title: "NotionLocal", icon: null },
];

describe("Breadcrumb", () => {
  it("returns null for empty items array", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for a single item", () => {
    const { container } = render(<Breadcrumb items={[three[0]]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all item titles for a multi-level path", () => {
    render(<Breadcrumb items={three} />);
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Proyectos")).toBeInTheDocument();
    expect(screen.getByText("NotionLocal")).toBeInTheDocument();
  });

  it("renders ancestor items as navigation links with correct href", () => {
    render(<Breadcrumb items={three} />);
    const inicioLink = screen.getByRole("link", { name: /Inicio/ });
    expect(inicioLink).toHaveAttribute("href", "/page/1");
    const proyectosLink = screen.getByRole("link", { name: /Proyectos/ });
    expect(proyectosLink).toHaveAttribute("href", "/page/2");
  });

  it("renders the last item as plain text without a link", () => {
    render(<Breadcrumb items={three} />);
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).not.toHaveTextContent("NotionLocal");
    });
    expect(screen.getByText("NotionLocal")).toBeInTheDocument();
  });

  it("shows icons when provided", () => {
    render(<Breadcrumb items={three} />);
    expect(screen.getAllByText("🏠").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("🚀").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'Sin título' fallback for items with empty title", () => {
    const empty: BreadcrumbItem[] = [
      { id: "a", title: "", icon: null },
      { id: "b", title: "", icon: null },
    ];
    render(<Breadcrumb items={empty} />);
    expect(screen.getAllByText("Sin título")).toHaveLength(2);
  });

  it("renders correctly for a two-level path", () => {
    const two: BreadcrumbItem[] = [
      { id: "x", title: "Padre", icon: null },
      { id: "y", title: "Hijo", icon: null },
    ];
    render(<Breadcrumb items={two} />);
    expect(screen.getByRole("link", { name: /Padre/ })).toHaveAttribute("href", "/page/x");
    expect(screen.queryByRole("link", { name: /Hijo/ })).toBeNull();
    expect(screen.getByText("Hijo")).toBeInTheDocument();
  });
});
