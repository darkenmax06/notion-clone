import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FieldType } from "@prisma/client";
import GalleryView from "@/components/views/GalleryView";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

const titleField: FieldRow = {
  id: "field-title",
  name: "Titulo",
  type: FieldType.TEXT,
  position: 0,
  options: [],
};

const imageField: FieldRow = {
  id: "field-image",
  name: "Imagen",
  type: FieldType.URL,
  position: 1,
  options: [],
};

const statusField: FieldRow = {
  id: "field-status",
  name: "Estado",
  type: FieldType.SELECT,
  position: 2,
  options: [{ value: "Pendiente", color: "#ef4444" }],
};

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: {
      "field-title": "Diseñar portada",
      "field-image": "https://picsum.photos/300/200",
      "field-status": "Pendiente",
    },
  },
  {
    id: "rec-2",
    position: 1,
    values: {
      "field-title": "Crear copy",
      "field-status": "Pendiente",
    },
  },
];

describe("GalleryView", () => {
  it("renders cards for records", () => {
    render(
      <GalleryView
        fields={[titleField, imageField, statusField]}
        records={records}
        imageFieldId={imageField.id}
        onImageFieldChange={jest.fn()}
        onSelectRecord={jest.fn()}
        onAddRecord={jest.fn()}
      />
    );

    expect(screen.getByTestId("gallery-card-rec-1")).toBeInTheDocument();
    expect(screen.getByText("Diseñar portada")).toBeInTheDocument();
    expect(screen.getByText("Crear copy")).toBeInTheDocument();
  });

  it("calls onImageFieldChange when selecting a different image field", async () => {
    const onImageFieldChange = jest.fn().mockResolvedValue(undefined);

    render(
      <GalleryView
        fields={[titleField, imageField, statusField]}
        records={records}
        imageFieldId={null}
        onImageFieldChange={onImageFieldChange}
        onSelectRecord={jest.fn()}
        onAddRecord={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("gallery-image-selector"));
    fireEvent.click(screen.getByTestId(`gallery-image-option-${imageField.id}`));

    await waitFor(() => {
      expect(onImageFieldChange).toHaveBeenCalledWith(imageField.id);
    });
  });

  it("calls onAddRecord from toolbar button", () => {
    const onAddRecord = jest.fn();
    render(
      <GalleryView
        fields={[titleField, imageField, statusField]}
        records={records}
        imageFieldId={imageField.id}
        onImageFieldChange={jest.fn()}
        onSelectRecord={jest.fn()}
        onAddRecord={onAddRecord}
      />
    );

    fireEvent.click(screen.getByText("Nuevo"));
    expect(onAddRecord).toHaveBeenCalledTimes(1);
  });

  it("shows empty state when no records", () => {
    render(
      <GalleryView
        fields={[titleField, imageField, statusField]}
        records={[]}
        imageFieldId={imageField.id}
        onImageFieldChange={jest.fn()}
        onSelectRecord={jest.fn()}
        onAddRecord={jest.fn()}
      />
    );

    expect(screen.getByText(/sin registros para mostrar en galeria/i)).toBeInTheDocument();
  });
});
