"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TemplateGallery from "@/components/ui/TemplateGallery";

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("@/lib/actions/pages", () => ({
  createPage: jest.fn(),
  createPageFromTemplate: jest.fn(),
  getTemplates: jest.fn(),
}));

import { createPage, createPageFromTemplate, getTemplates } from "@/lib/actions/pages";

const mockCreatePage = createPage as jest.Mock;
const mockCreatePageFromTemplate = createPageFromTemplate as jest.Mock;
const mockGetTemplates = getTemplates as jest.Mock;

describe("TemplateGallery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTemplates.mockResolvedValue([
      { id: "tpl1", title: "Meeting Notes", icon: "📝", isSystem: true },
    ]);
  });

  it("does not render when closed", () => {
    render(<TemplateGallery open={false} onClose={jest.fn()} />);
    expect(screen.queryByText("Galeria de templates")).not.toBeInTheDocument();
  });

  it("loads templates when opened", async () => {
    render(<TemplateGallery open={true} onClose={jest.fn()} />);

    await waitFor(() => expect(mockGetTemplates).toHaveBeenCalled());
    expect(await screen.findByText("Meeting Notes")).toBeInTheDocument();
  });

  it("creates blank page and navigates", async () => {
    const onClose = jest.fn();
    mockCreatePage.mockResolvedValue({ success: true, page: { id: "page1" } });

    render(<TemplateGallery open={true} parentId={null} onClose={onClose} />);
    await screen.findByText("Pagina vacia");

    fireEvent.click(screen.getByText("Pagina vacia"));

    await waitFor(() => expect(mockCreatePage).toHaveBeenCalledWith({ title: "Sin titulo", parentId: null }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/page/page1"));
    expect(onClose).toHaveBeenCalled();
  });

  it("creates page from selected template", async () => {
    mockCreatePageFromTemplate.mockResolvedValue({ success: true, page: { id: "fromTpl" } });

    render(<TemplateGallery open={true} parentId={"parent1"} onClose={jest.fn()} />);
    await screen.findByText("Meeting Notes");

    fireEvent.click(screen.getByText("Meeting Notes"));

    await waitFor(() =>
      expect(mockCreatePageFromTemplate).toHaveBeenCalledWith({
        templateId: "tpl1",
        parentId: "parent1",
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/page/fromTpl"));
  });
});
