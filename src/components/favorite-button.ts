import { h } from "../lib/dom";
import { icon } from "../lib/icons";
import { isFavorite, toggleFavorite } from "../lib/state";
import { showToast } from "../lib/toast";
import type { Drink } from "../lib/types";

function paint(button: HTMLButtonElement): void {
  const id = button.dataset.favId;
  if (!id) return;
  const active = isFavorite(id);
  const action = active ? "Remover dos favoritos" : "Adicionar aos favoritos";
  const labeled = button.classList.contains("favorite-button--labeled");
  button.classList.toggle("is-favorite", active);
  button.setAttribute("aria-pressed", active ? "true" : "false");
  if (labeled) {
    // O nome acessível vem do texto visível (Favoritar / Nos favoritos).
    button.removeAttribute("aria-label");
  } else {
    button.setAttribute("aria-label", action);
  }
  button.title = action;
  const iconSlot = button.querySelector<HTMLElement>(".fav-icon");
  if (iconSlot) iconSlot.innerHTML = icon(active ? "heart-filled" : "heart");
  const label = button.querySelector<HTMLElement>(".fav-label");
  if (label) label.textContent = active ? "Nos favoritos" : "Favoritar";
}

export function syncFavoriteButtons(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-fav-id]").forEach(paint);
}

window.addEventListener("guia:favoritos", syncFavoriteButtons);

export function createFavoriteButton(
  drink: Drink,
  options: { withLabel?: boolean; className?: string } = {},
): HTMLButtonElement {
  const button = h(
    "button",
    {
      type: "button",
      class: `favorite-button ${options.withLabel ? "favorite-button--labeled" : ""} ${options.className ?? ""}`,
      "data-fav-id": drink.id,
      "aria-pressed": "false",
      onclick: (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const active = toggleFavorite(drink.id);
        showToast(
          active
            ? `${drink.nome} entrou na sua lista de favoritos.`
            : `${drink.nome} saiu da sua lista de favoritos.`,
        );
      },
    },
    h("span", { class: "fav-icon", html: icon("heart") }),
    options.withLabel ? h("span", { class: "fav-label", text: "Favoritar" }) : null,
  ) as HTMLButtonElement;
  paint(button);
  return button;
}
