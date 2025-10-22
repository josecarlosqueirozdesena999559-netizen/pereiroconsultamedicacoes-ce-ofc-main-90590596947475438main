import React from "react";
import { useAnnouncements } from "./AnnouncementProvider";

const tone = {
  info: "bg-blue-50 text-blue-900 border-blue-200",
  success: "bg-green-50 text-green-900 border-green-200",
  warning: "bg-yellow-50 text-yellow-900 border-yellow-200",
  danger: "bg-red-50 text-red-900 border-red-200",
};

export default function AnnouncementBar() {
  const { items, dismiss } = useAnnouncements();
  if (!items.length) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      {items.map(a => (
        <div key={a.id} className={`border ${tone[a.type ?? "info"]}`}>
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="font-semibold">
                {a.title} {a.version && <span className="opacity-70">({a.version})</span>}
              </p>
              <p className="text-sm opacity-90">{a.message}</p>
              {a.cta?.href && (
                <a href={a.cta.href} className="mt-1 inline-block text-sm underline">
                  {a.cta.label}
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(a.id)}
              className="rounded px-3 py-1 text-sm border bg-white/70 hover:bg-white"
            >
              Fechar
            </button>
          </div>
        </div>
      ))}
      <div className="h-14" />
    </div>
  );
}
