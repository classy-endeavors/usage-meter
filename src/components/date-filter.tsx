"use client";

export type RangePreset = "1d" | "7d" | "30d" | "custom";

export function DateFilter({
  range,
  from,
  to,
  onRange,
  onFrom,
  onTo,
}: {
  range: RangePreset;
  from: string;
  to: string;
  onRange: (value: RangePreset) => void;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const presets: { id: RangePreset; label: string }[] = [
    { id: "1d", label: "1d" },
    { id: "7d", label: "7d" },
    { id: "30d", label: "30d" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-full border border-black/10 bg-white p-1 shadow-sm">
        {presets.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onRange(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              range === item.id
                ? "bg-black text-white"
                : "text-neutral-600 hover:text-teal-600"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {range === "custom" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            onChange={(event) => onFrom(event.target.value)}
            className="rounded-full border border-black/10 px-3 py-2 text-neutral-700"
          />
          <span className="text-neutral-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(event) => onTo(event.target.value)}
            className="rounded-full border border-black/10 px-3 py-2 text-neutral-700"
          />
        </div>
      ) : null}
    </div>
  );
}
