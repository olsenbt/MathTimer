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