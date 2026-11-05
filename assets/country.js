(() => {
  const supportedCountries = new Set(["PK", "US"]);
  const storageKey = "articlea_country";
  const toggle = document.getElementById("country-toggle");
  const codeLabel = document.getElementById("country-code");
  const menu = document.getElementById("country-menu");
  const dialog = document.getElementById("country-dialog");
  if (!toggle || !codeLabel || !menu || !dialog) return;

  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  const showCountryPrompt = () => {
    dialog.hidden = false;
    const firstOption = dialog.querySelector("[data-country]");
    if (firstOption) firstOption.focus();
  };

  const selectCountry = country => {
    if (!supportedCountries.has(country)) return;
    codeLabel.textContent = country;
    toggle.setAttribute(
      "aria-label",
      country === "PK" ? "Country: Pakistan. Change country" : "Country: United States. Change country"
    );
    try {
      localStorage.setItem(storageKey, country);
    } catch {
      // Keep the selection for this page view if browser storage is unavailable.
    }
    closeMenu();
    dialog.hidden = true;
    document.dispatchEvent(new CustomEvent("articlea:countrychange", { detail: { country } }));
  };

  toggle.addEventListener("click", () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".country-wrap")) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  document.querySelectorAll("[data-country]").forEach(button => {
    button.addEventListener("click", () => selectCountry(button.dataset.country));
  });

  let savedCountry = "";
  try {
    const saved = localStorage.getItem(storageKey);
    if (supportedCountries.has(saved)) savedCountry = saved;
  } catch {
    // Automatic detection can still work when local storage is unavailable.
  }

  if (savedCountry) {
    selectCountry(savedCountry);
    return;
  }

  const detectCountry = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch("https://ipapi.co/country/", {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Country lookup unavailable");
      const country = (await response.text()).trim().toUpperCase();
      if (!supportedCountries.has(country)) throw new Error("Country not supported yet");
      selectCountry(country);
    } catch {
      showCountryPrompt();
    } finally {
      clearTimeout(timeout);
    }
  };

  detectCountry();
})();
