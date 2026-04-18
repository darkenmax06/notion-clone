"use client";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SidebarClient } from "@/components/sidebar/SidebarClient";
import type { PageNode } from "@/components/sidebar/SidebarServer";

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("@/lib/actions/pages", () => ({
  createPage: jest.fn(),
  deletePage: jest.fn(),
}));

jest.mock("@/lib/actions/databases", () => ({
  createDatabase: jest.fn(),
  deleteDatabase: jest.fn(),
}));

import { createPage, deletePage } from "@/lib/actions/pages";
const mockCreatePage = createPage as jest.Mock;
const mockDeletePage = deletePage as jest.Mock;

const leaf: PageNode = {
  id: "leaf1",
  title: "Página hoja",
  icon: "📄",
  parentId: null,
  position: 0,
  children: [],
};

const withChildren: PageNode = {
  id: "parent1",
  title: "Página padre",
  icon: "📁",
  parentId: null,
  position: 0,
  children: [
    {
      id: "child1",
      title: "Subpágina",
      icon: null,
      parentId: "parent1",
      position: 0,
      children: [],
    },
  ],
};

describe("SidebarClient", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the NotionLocal header", () => {
    render(<SidebarClient initialTree={[]} initialDatabases={[]} />);
    expect(screen.getByText("NotionLocal")).toBeInTheDocument();
  });

  it("shows empty state when tree is empty", () => {
    render(<SidebarClient initialTree={[]} initialDatabases={[]} />);
    expect(screen.getByText(/Sin páginas/)).toBeInTheDocument();
  });

  it("renders page titles from the initial tree", () => {
    render(<SidebarClient initialTree={[leaf]} initialDatabases={[]} />);
    expect(screen.getByText("Página hoja")).toBeInTheDocument();
  });

  it("renders page icons", () => {
    render(<SidebarClient initialTree={[leaf]} initialDatabases={[]} />);
    expect(screen.getByText("📄")).toBeInTheDocument();
  });

  it("does not show children before expanding", () => {
    render(<SidebarClient initialTree={[withChildren]} initialDatabases={[]} />);
    expect(screen.queryByText("Subpágina")).not.toBeInTheDocument();
  });

  it("expands children when the chevron button is clicked", () => {
    render(<SidebarClient initialTree={[withChildren]} initialDatabases={[]} />);
    // Button order: [0] header +, [1] expand chevron, [2] add child, [3] delete
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(screen.getByText("Subpágina")).toBeInTheDocument();
  });

  it("collapses children on second chevron click", () => {
    render(<SidebarClient initialTree={[withChildren]} initialDatabases={[]} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(screen.getByText("Subpágina")).toBeInTheDocument();
    fireEvent.click(buttons[1]);
    expect(screen.queryByText("Subpágina")).not.toBeInTheDocument();
  });

  it("calls createPage with null parentId and redirects to new page", async () => {
    mockCreatePage.mockResolvedValue({ success: true, page: { id: "new1" } });
    render(<SidebarClient initialTree={[]} initialDatabases={[]} />);
    const addBtn = screen.getByTitle("Nueva página raíz");
    fireEvent.click(addBtn);
    await waitFor(() => expect(mockCreatePage).toHaveBeenCalledWith({ parentId: null }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/page/new1"));
  });

  it("calls createPage with parentId when adding a child page", async () => {
    mockCreatePage.mockResolvedValue({ success: true, page: { id: "child2" } });
    render(<SidebarClient initialTree={[leaf]} initialDatabases={[]} />);
    const addChildBtn = screen.getByTitle("Añadir subpágina");
    fireEvent.click(addChildBtn);
    await waitFor(() =>
      expect(mockCreatePage).toHaveBeenCalledWith({ parentId: "leaf1" })
    );
  });

  it("calls deletePage with the correct id", async () => {
    mockDeletePage.mockResolvedValue({ success: true });
    render(<SidebarClient initialTree={[leaf]} initialDatabases={[]} />);
    const deleteBtn = screen.getByTitle("Eliminar página");
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(mockDeletePage).toHaveBeenCalledWith({ id: "leaf1" }));
  });

  it("renders a link to the page for each node", () => {
    render(<SidebarClient initialTree={[leaf]} initialDatabases={[]} />);
    const link = screen.getByRole("link", { name: /Página hoja/ });
    expect(link).toHaveAttribute("href", "/page/leaf1");
  });
});
