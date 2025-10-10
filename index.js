document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".levels a").forEach(link => {
    const id = link.dataset.id;
    const score = localStorage.getItem(id);

    if (score === "30") {
      link.classList.add("completed");
      link.title = "Completed (30/30)";
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const timerToggle = document.getElementById("show-timer");
  const testLinks = document.querySelectorAll(".levels a");

  testLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      const href = link.getAttribute("href");
      const timerEnabled = timerToggle.checked;
      const finalUrl = timerEnabled ? href : `${href}&timer=off`;

      window.location.href = finalUrl;
    });
  });
});