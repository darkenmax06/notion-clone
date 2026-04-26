import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FieldType } from "@prisma/client";
import TimelineView from "@/components/views/TimelineView";
import type { FieldRow, RecordRow } from "@/components/views/DatabaseView";

const titleField: FieldRow = {
  id: "field-title",
  name: "Tarea",
  type: FieldType.TEXT,
  position: 0,
  options: [],
};

const startField: FieldRow = {
  id: "field-start",
  name: "Inicio",
  type: FieldType.DATE,
  position: 1,
  options: [],
};

const endField: FieldRow = {
  id: "field-end",
  name: "Fin",
  type: FieldType.DATE,
  position: 2,
  options: [],
};

const records: RecordRow[] = [
  {
    id: "rec-1",
    position: 0,
    values: {
      "field-title": "Sprint 1",
      "field-start": "2026-04-01",
      "field-end": "2026-04-04",
    },
  },
];

describe("TimelineView", () => {
  it("renders timeline bars for valid records", () => {
    render(
      <TimelineView
        fields={[titleField, startField, endField]}
        records={records}
        startFieldId={startField.id}
        endFieldId={endField.id}
        onStartFieldChange={jest.fn()}
        onEndFieldChange={jest.fn()}
        onUpdateRecord={jest.fn().mockResolvedValue(undefined)}
        onSelectRecord={jest.fn()}
      />
    );

    expect(screen.getByTestId("timeline-bar-rec-1")).toBeInTheDocument();
    expect(screen.getAllByText("Sprint 1").length).toBeGreaterThan(0);
  });

  it("calls field change callbacks from selectors", async () => {
    const onStartFieldChange = jest.fn().mockResolvedValue(undefined);
    const onEndFieldChange = jest.fn().mockResolvedValue(undefined);

    render(
      <TimelineView
        fields={[titleField, startField, endField]}
        records={records}
        startFieldId={startField.id}
        endFieldId={endField.id}
        onStartFieldChange={onStartFieldChange}
        onEndFieldChange={onEndFieldChange}
        onUpdateRecord={jest.fn().mockResolvedValue(undefined)}
        onSelectRecord={jest.fn()}
      />
    );

    fireEvent.change(screen.getByTestId("timeline-start-field"), { target: { value: endField.id } });
    fireEvent.change(screen.getByTestId("timeline-end-field"), { target: { value: startField.id } });

    await waitFor(() => {
      expect(onStartFieldChange).toHaveBeenCalledWith(endField.id);
      expect(onEndFieldChange).toHaveBeenCalledWith(startField.id);
    });
  });

  it("drags a bar and persists shifted dates", async () => {
    const onUpdateRecord = jest.fn().mockResolvedValue(undefined);

    render(
      <TimelineView
        fields={[titleField, startField, endField]}
        records={records}
        startFieldId={startField.id}
        endFieldId={endField.id}
        onStartFieldChange={jest.fn()}
        onEndFieldChange={jest.fn()}
        onUpdateRecord={onUpdateRecord}
        onSelectRecord={jest.fn()}
      />
    );

    const bar = screen.getByTestId("timeline-bar-rec-1");
    fireEvent.mouseDown(bar, { button: 0, clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 156 });
    fireEvent.mouseUp(window);

    await waitFor(() => {
      expect(onUpdateRecord).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({
          "field-start": "2026-04-03",
          "field-end": "2026-04-06",
        })
      );
    });
  });

  it("shows requirements message when there are less than two DATE fields", () => {
    render(
      <TimelineView
        fields={[titleField, startField]}
        records={records}
        startFieldId={startField.id}
        endFieldId={startField.id}
        onStartFieldChange={jest.fn()}
        onEndFieldChange={jest.fn()}
        onUpdateRecord={jest.fn().mockResolvedValue(undefined)}
        onSelectRecord={jest.fn()}
      />
    );

    expect(screen.getByText(/requiere al menos dos campos de tipo/i)).toBeInTheDocument();
  });
});
