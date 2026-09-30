import type { CanvasAddonMountContext } from "../generated/mywallpaper-runtime";
import { card, el } from "./ui";
import { timer } from "./timing";
import "./style.css";
export function mount(context: CanvasAddonMountContext) {
  const view = card(context, "Rappel"),
    text = el("div", "", "quote"),
    ack = el("button", "Marquer comme lu");
  view.body.append(text, ack);
  let values = context.layer.settings.get(),
    state = context.layer.deviceSettings.get();
  const render = () => {
    const target = String(values.target ?? ""),
      stamp = Date.parse(target);
    text.textContent = String(values.message || "Rappel");
    if (!Number.isFinite(stamp)) {
      view.caption.textContent =
        "Choisissez une date ISO avec fuseau dans les réglages.";
      ack.disabled = true;
      return;
    }
    const due = Date.now() >= stamp,
      read = state.acknowledged === target;
    ack.disabled = !due || read;
    view.header.textContent = read
      ? "Rappel lu"
      : due
        ? "C’est le moment"
        : "À venir";
    view.caption.textContent =
      new Date(stamp).toLocaleString("fr-FR") + (read ? " · lu" : "");
    view.section.style.background =
      due && !read ? "linear-gradient(145deg,#344238,#142023)" : "";
  };
  const mark = () => {
    const target = String(values.target ?? "");
    if (!Number.isFinite(Date.parse(target)) || Date.now() < Date.parse(target))
      return;
    state = { acknowledged: target };
    render();
    void context.layer.deviceSettings.set(state).catch(() => {
      view.caption.textContent = "Lecture non enregistrée";
    });
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
    stop();
    stopDevice();
    action();
    stopTimer();
    ack.onclick = null;
    view.section.remove();
  };
}
