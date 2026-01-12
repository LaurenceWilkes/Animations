  function generateSnowflakes(count = 180) {
    const snow = document.getElementById('snow');
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('div');
      flake.className = 'snowflake';
//      flake.innerHTML = '&#10052;';
      flake.innerHTML = '.';
      flake.style.left = Math.random() * 100 + 'vw';
      const near = Math.random();
      flake.style.fontSize =  (near * 1.2 + 0.6) + 'em';
  //    flake.style.fontSize =  (near * 1.2 + 1.6) + 'em';
      flake.style.animationDuration = ((1 - near) * 5 + 5) + 's';
      flake.style.animationDelay = (-Math.random() * 5) + 's';
      snow.appendChild(flake);
    }
  }
