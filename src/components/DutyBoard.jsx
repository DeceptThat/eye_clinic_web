"use client";
import Link from "next/link";
import { Avatar, Icon } from "@/components/ui";

const OPEN_HOUR = 9;   // keep in sync with api/appointments/next-slot
const CLOSE_HOUR = 18;
const SLOT_MIN = 30;
const SLOT_MS = SLOT_MIN * 60000;

const hhmm = (ms) =>
  new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" });

function buildSlots(dayStartIso) {
  const dayStart = new Date(dayStartIso).getTime();
  const slots = [];
  for (let m = OPEN_HOUR * 60; m < CLOSE_HOUR * 60; m += SLOT_MIN) slots.push(dayStart + m * 60000);
  return slots;
}

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

export default function DutyBoard({ dayStart, weekday, onDuty, offToday, appointments, now }) {
  const slots = buildSlots(dayStart);
  const cols = { gridTemplateColumns: `minmax(190px, 220px) repeat(${slots.length}, minmax(34px, 1fr))` };

  const rows = onDuty.map((d) => {
    const appts = appointments.filter((a) => a.doctor?._id === d._id && a.status !== "Cancelled");
    let free = 0;
    let booked = 0;
    let bookedAhead = 0; // booked slots that haven't finished yet
    const cells = slots.map((t) => {
      const end = t + SLOT_MS;
      const appt = appts.find((a) => {
        const s = new Date(a.dateTime).getTime();
        return overlaps(s, s + SLOT_MS, t, end);
      });
      if (appt) {
        booked++;
        if (end > now) bookedAhead++;
        return { t, kind: "booked", appt };
      }
      const off = d.timeOff.find((o) => overlaps(new Date(o.start).getTime(), new Date(o.end).getTime(), t, end));
      if (off) return { t, kind: "off", off };
      if (end <= now) return { t, kind: "past" };
      free++;
      return { t, kind: "free" };
    });
    const offNow = d.timeOff.find((o) => new Date(o.start).getTime() <= now && now < new Date(o.end).getTime());
    return { d, cells, free, booked, bookedAhead, offNow };
  });

  const currentSlot = slots.find((t) => t <= now && now < t + SLOT_MS);

  return (
    <div className="card">
      <div className="card-header flex-wrap">
        <div>
          <h2 className="card-title">Doctors on duty today</h2>
          <p className="text-xs text-slate-500">
            {weekday} · {OPEN_HOUR}:00 to {CLOSE_HOUR}:00 · click a free slot to book it
          </p>
        </div>
        <Legend />
      </div>

      {onDuty.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-medium text-slate-700">No doctors are working today ({weekday}).</p>
          <p className="mt-1 text-sm text-slate-500">Walk-ins can&apos;t be seen today. Book them for another day.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px] px-5 py-4">
            {/* time header */}
            <div className="grid items-end gap-1 pb-2" style={cols}>
              <div />
              {slots.map((t, i) => (
                <div
                  key={t}
                  className={`text-[11px] ${t === currentSlot ? "font-semibold text-brand-600" : "text-slate-400"}`}
                >
                  {i % 2 === 0 ? hhmm(t) : ""}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {rows.map(({ d, cells, free, booked, bookedAhead, offNow }) => (
                <div key={d._id} className="grid items-center gap-1" style={cols}>
                  <div className="flex min-w-0 items-center gap-2.5 pr-3">
                    <Avatar name={`${d.firstName} ${d.lastName}`} tone="violet" size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">Dr. {d.firstName} {d.lastName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {offNow ? (
                          <span className="text-amber-700">Off now · {offNow.reason}</span>
                        ) : (
                          <>
                            <SlotStatus free={free} bookedAhead={bookedAhead} />
                            {" "}· {booked} booked
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {cells.map((c) => (
                    <Cell key={c.t} cell={c} doctorId={d._id} isNow={c.t === currentSlot} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {offToday.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3 text-sm">
          <span className="text-slate-500">Not working today:</span>
          {offToday.map((d) => (
            <span key={d._id} className="badge badge-gray" title={`Works ${d.workingDays.join(", ") || "no days"}`}>
              Dr. {d.firstName} {d.lastName}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// "3 free" / "Fully booked" (time left, all taken) / "Day finished" (no time left)
function SlotStatus({ free, bookedAhead }) {
  if (free > 0) return <span className="text-emerald-700">{free} free</span>;
  if (bookedAhead > 0) return <span className="text-red-600">Fully booked</span>;
  return <span className="text-slate-500">Day finished</span>;
}

function Cell({ cell, doctorId, isNow }) {
  const ring = isNow ? " ring-2 ring-brand-400 ring-offset-1" : "";
  const base = "flex h-9 items-center justify-center rounded-md text-[10px] font-semibold";

  if (cell.kind === "booked") {
    const a = cell.appt;
    const name = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : "(deleted)";
    const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const done = a.status === "Completed";
    return (
      <div
        title={`${hhmm(new Date(a.dateTime).getTime())} · ${name} · ${a.reason}${done ? " (seen)" : ""}`}
        className={`${base} ${done ? "bg-emerald-500" : "bg-brand-600"} text-white${ring}`}
      >
        {initials}
      </div>
    );
  }
  if (cell.kind === "off") {
    return (
      <div
        title={`Time off: ${cell.off.reason}`}
        className={`${base} bg-amber-100 text-amber-700${ring}`}
        style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(217,119,6,.18) 4px, rgba(217,119,6,.18) 8px)" }}
      />
    );
  }
  if (cell.kind === "past") {
    return <div title={`${hhmm(cell.t)} · passed`} className={`${base} bg-slate-100${ring}`} />;
  }
  return (
    <Link
      href={`/appointments?new=1&doctor=${doctorId}&time=${encodeURIComponent(new Date(cell.t).toISOString())}`}
      title={`${hhmm(cell.t)} · free, click to book`}
      className={`${base} group border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:border-emerald-400 hover:bg-emerald-100${ring}`}
    >
      <Icon name="plus" className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" strokeWidth={2.5} />
    </Link>
  );
}

function Legend() {
  const item = (cls, label, style) => (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${cls}`} style={style} /> {label}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {item("border border-emerald-300 bg-emerald-50", "Free")}
      {item("bg-brand-600", "Booked")}
      {item("bg-emerald-500", "Seen")}
      {item("bg-amber-200", "Time off")}
      {item("bg-slate-200", "Passed")}
    </div>
  );
}
