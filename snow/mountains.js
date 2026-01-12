function generateMountains(count = 135, layerCount = 4, minHeight = 140, maxHeight = 320, lightestGrey = 32) {
  const mountains = document.getElementById("mountains");
  mountains.innerHTML = "";

  const w = window.innerWidth;

  const mtns = [];
  for (let i = 0; i < count; i++) {
    const height = minHeight + Math.random() * (maxHeight - minHeight);
//      const base = 100 + Math.random() * 400;   
    const base = height * (1 + 2 * Math.random());
    const x = Math.random() * w;
    mtns.push({ base, height, x });
  }

  mtns.sort((a, b) => b.height - a.height);

  for (let i = 0; i < count; i++) {
    const mtn = document.createElement("div");
    const m = mtns[i];
    mtn.className = "mountain";
    mtn.style.borderLeftWidth = (m.base / 2) + "px";
    mtn.style.borderRightWidth = (m.base / 2) + "px";
    mtn.style.borderBottomWidth = m.height + "px";

    const layer = Math.floor(layerCount * i / count);
    const c = lightestGrey * (layerCount - layer) / layerCount;
    mtn.style.borderBottomColor = `rgb(${c}, ${c}, ${c})`;
    const blur = c / lightestGrey;
    mtn.style.filter = `blur(${blur}px)`;

    mtn.style.left = (m.x - m.base / 2) + "px";

    mountains.appendChild(mtn);
  }
}
