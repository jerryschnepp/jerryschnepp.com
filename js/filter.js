// Filter chips and search for the publications and talks lists.
{
  for (const root of document.querySelectorAll("[data-filter-root]")) {
    const chips = [...root.querySelectorAll(".chip")];
    const search = root.querySelector(".search");
    const items = [...root.querySelectorAll(".entries li")];
    const groups = [...root.querySelectorAll(".year-group")];
    const count = root.querySelector(".count");
    const empty = root.querySelector(".empty");
    const noun = root.dataset.noun || "items";
    const text = new Map(items.map((li) => [li, li.textContent.toLowerCase()]));
    let kind = "all";

    const apply = () => {
      const q = (search ? search.value : "").trim().toLowerCase();
      let shown = 0;
      for (const li of items) {
        const ok = (kind === "all" || li.dataset.kind === kind) && (!q || text.get(li).includes(q));
        li.hidden = !ok;
        li.classList.remove("first");
        if (ok) shown++;
      }
      for (const g of groups) {
        const first = g.querySelector(".entries li:not([hidden])");
        g.hidden = !first;
        if (first) first.classList.add("first");
      }
      if (count) count.textContent = `Showing ${shown} of ${items.length} ${noun}`;
      if (empty) empty.hidden = shown > 0;
    };

    for (const chip of chips) {
      chip.addEventListener("click", () => {
        kind = chip.dataset.kind;
        for (const c of chips) c.setAttribute("aria-pressed", String(c === chip));
        apply();
      });
    }
    if (search) search.addEventListener("input", apply);
    apply();
  }
}
