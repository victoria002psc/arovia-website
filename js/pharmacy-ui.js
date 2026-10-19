(function () {
  if (!document.body || !document.body.classList.contains("pharmacy-page")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var nodes = document.querySelectorAll(".pharmacy-reveal");
  document.documentElement.classList.add("pharmacy-motion");

  if (!("IntersectionObserver" in window)) {
    nodes.forEach(function (node) {
      node.classList.add("is-in");
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -32px 0px" });

  nodes.forEach(function (node) {
    if (node.classList.contains("pharmacy-reveal--now")) {
      node.classList.add("is-in");
      return;
    }
    var siblings = node.parentElement.querySelectorAll(":scope > .pharmacy-reveal");
    var index = Array.prototype.indexOf.call(siblings, node);
    if (index > 0) {
      node.style.setProperty("--pharmacy-delay", Math.min(index, 4) * 70 + "ms");
    }
    observer.observe(node);
  });
})();
