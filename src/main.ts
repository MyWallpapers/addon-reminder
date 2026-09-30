import type { CanvasAddonMountContext } from "../generated/mywallpaper-runtime";
import { card, el } from "./ui";
import { timer } from "./timing";
import "./style.css";
import { deviceWriter } from "./device-write";
export function mount(context: CanvasAddonMountContext) {
  const view = card(context, "Rappel"),
    text = el("div", "", "quote"),
    ack = el("button", "Marquer comme lu");
  view.body.append(text, ack);
  let values = context.layer.settings.get(),
    state = context.layer.deviceSettings.get(),
    pending = false,
    error = "";
  const render = () => {
    const target = String(values.target ?? ""),
      stamp = Date.parse(target);
    text.textContent = String(values.message || "Rappel");
    view.header.textContent = "Rappel";
    view.section.style.background = "";
    view.caption.classList.toggle("error", Boolean(error));
    if (!Number.isFinite(stamp)) {
      view.caption.textContent =
        error || "Choisissez une date ISO avec fuseau dans les réglages.";
      ack.disabled = true;
      return;
    }
    const due = Date.now() >= stamp,
      read = state.acknowledged === target;
    ack.disabled = !due || read || pending;
    view.header.textContent = read
      ? "Rappel lu"
      : due
        ? "C’est le moment"
        : "À venir";
    view.caption.textContent =
      error || new Date(stamp).toLocaleString("fr-FR") + (read ? " · lu" : "");
    view.section.style.background =
      due && !read ? "linear-gradient(145deg,#344238,#142023)" : "";
  };
  const writer = deviceWriter(
    context,
    (next) => {
      state = next;
      render();
    },
    (busy, message) => {
      pending = busy;
      error = message;
      render();
    },
    "Lecture non enregistrée",
  );
  const mark = () => {
    const target = String(values.target ?? "");
    if (!Number.isFinite(Date.parse(target)) || Date.now() < Date.parse(target))
      return;
    writer.write({ acknowledged: target });
  };
  ack.onclick = mark;
  const stop = context.layer.settings.subscribe((next) => {
      values = next;
      render();
    }),
    stopDevice = context.layer.deviceSettings.subscribe((next) => {
      state = next;
      render();
    }),
    action = context.layer.actions.on("acknowledge", mark),
    stopTimer = timer(context, render);
  return () => {
    writer.dispose();
    stop();
    stopDevice();
    action();
    stopTimer();
    ack.onclick = null;
    view.section.remove();
  };
}
