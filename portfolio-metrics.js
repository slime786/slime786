(() => {
  "use strict";

  const metrics = Object.freeze({
    repositories: 17,
    newBuilds: 5
  });

  window.SLIME786_METRICS = metrics;

  const hydrate = () => {
    document.querySelectorAll("[data-portfolio-metric]").forEach((node) => {
      const key = node.getAttribute("data-portfolio-metric");
      if (!key || !(key in metrics)) return;
      node.textContent = String(metrics[key]);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hydrate, { once: true });
  } else {
    hydrate();
  }
})();
