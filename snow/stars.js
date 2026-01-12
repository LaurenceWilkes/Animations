function generateStars(count = 140) {
  const stars = document.getElementById("stars");
  stars.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "star";

    s.style.left = (Math.random() * 100) + "vw";
    s.style.top = (Math.random() * 60) + "vh"; 

    const size = 1 + Math.random() * 2.2;
    s.style.width = size + "px";
    s.style.height = size + "px";

    s.style.animationDuration = (8 + Math.random() * 23) + "s";
    s.style.animationDelay = (-Math.random() * 30) + "s";

    s.style.opacity = (0.3 + Math.random() * 0.7);

    stars.appendChild(s);
  }
}
