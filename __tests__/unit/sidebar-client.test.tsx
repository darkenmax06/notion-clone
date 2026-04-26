"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SidebarClient } from "@/components/sidebar/SidebarClient";
import type { PageNode } from "@/components/sidebar/SidebarServer";

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("@/lib/actions/pages", () => ({
  deletePage: jest.fn(),
  updatePage: jest.fn(),
}));

jest.mock("@/lib/actions/databases", () => ({
  createDatabase: jest.fn(),
  deleteDatabase: jest.fn(),
  updateDatabase: jest.fn(),
}));

jest.mock("@/components/ui/TemplateGallery", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="template-gallery" /> : null),
}));

import { deletePage } from "@/lib/actions/pages";
const mockDeletePage = deletePage as jest.Mock;

const leaf: PageNode = {
  id: "leaf1",
  title: "Pagina hoja",
  icon: "📄",
  parentId: null,
  position: 0,
  children: [],
};

const withChildren: PageNode = {
  id: "parent1",
  title: "Pagina padre",
  icon: "📁",
  parentId: null,
  position: 0,
  children: [
    {
      id: "child1",
      title: "Subpagina",
      icon: null,
      parentId: "parent1",
      position: 0,
      children: [],
    },
  ],
};

describe("SidebarClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the NotionLocal header", () => {
    render(
      <SidebarClient
        initialTree={[]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );
    expect(screen.getByText("NotionLocal")).toBeInTheDocument();
  });

  it("renders quick links for Templates and Trash", () => {
    render(
      <SidebarClient
        initialTree={[]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={3}
      />
    );

    expect(screen.getByRole("link", { name: /Plantillas/i })).toHaveAttribute("href", "/templates");
    expect(screen.getByRole("link", { name: /Papelera/i })).toHaveAttribute("href", "/trash");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows empty states for pages and favorites", () => {
    render(
      <SidebarClient
        initialTree={[]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );
    expect(screen.getByText(/Sin paginas/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin favoritos/i)).toBeInTheDocument();
  });

  it("renders favorite pages section", () => {
    render(
      <SidebarClient
        initialTree={[]}
        initialDatabases={[]}
        initialFavorites={[{ id: "fav1", title: "Favorita", icon: "⭐" }]}
        initialTrashCount={0}
      />
    );

    const favoriteLink = screen.getByRole("link", { name: /Favorita/i });
    expect(favoriteLink).toHaveAttribute("href", "/page/fav1");
  });

  it("renders page titles from tree", () => {
    render(
      <SidebarClient
        initialTree={[leaf]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );
    expect(screen.getByText("Pagina hoja")).toBeInTheDocument();
  });

  it("expands children when the chevron is clicked", () => {
    render(
      <SidebarClient
        initialTree={[withChildren]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );
    expect(screen.queryByText("Subpagina")).not.toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(screen.getByText("Subpagina")).toBeInTheDocument();
  });

  it("opens template gallery for root page creation", () => {
    render(
      <SidebarClient
        initialTree={[]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );

    fireEvent.click(screen.getByTitle("Nueva pagina raiz"));
    expect(screen.getByTestId("template-gallery")).toBeInTheDocument();
  });

  it("opens template gallery for child page creation", () => {
    render(
      <SidebarClient
        initialTree={[leaf]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );

    fireEvent.click(screen.getByTitle("Anadir subpagina"));
    expect(screen.getByTestId("template-gallery")).toBeInTheDocument();
  });

  it("calls deletePage with correct id", async () => {
    mockDeletePage.mockResolvedValue({ success: true });
    render(
      <SidebarClient
        initialTree={[leaf]}
        initialDatabases={[]}
        initialFavorites={[]}
        initialTrashCount={0}
      />
    );

    fireEvent.click(screen.getByTitle("Eliminar pagina"));
    await waitFor(() => expect(mockDeletePage).toHaveBeenCalledWith({ id: "leaf1" }));
  });
});
