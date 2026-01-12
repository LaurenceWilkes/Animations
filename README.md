# Animations Sandbox

A small collection of physics based 2D animations.

---

## Quick links

- **Planet Sandbox (interactive)**  
  Click to place bodies.
  → https://laurencewilkes.github.io/Animations/planets/planetsandbox/index.html

- **3 Body (GIF)**  
  Classic three-body gravitational motion with trails.  
  → https://laurencewilkes.github.io/Animations/planets/3body/planets.gif

- **8 Planets (GIF)**  
  An N-body variant with 8 bodies and trails.  
  → https://laurencewilkes.github.io/Animations/planets/oct/planets.gif

- **12 Planets (GIF)**  
  → https://laurencewilkes.github.io/Animations/planets/oct/planets2.gif

- **DVD (interactive)**  
  Click to place bodies.
  → https://laurencewilkes.github.io/Animations/racecar/dvd/index.html

- **Snow**  
  → https://laurencewilkes.github.io/Animations/snow/index.html

---

## Planet Sandbox (browser)

**What it is:** an interactive 2D particle toy model with pairwise “gravity” and optional trails/walls.

**How to use**
1. **Click** inside the canvas to spawn a new body.
2. Use the controls to adjust:
   - **Initial speed** (assigned in a random direction on spawn)
   - **Gravitational constant** `G`
   - **Mass** (for new bodies)
   - **Softening factor** `ε` (prevents singularities at tiny distances)
3. Buttons:
   - **Add/Remove walls**: bodies bounce elastically off the canvas boundary
   - **Clear trails**: wipes the canvas
   - **Add/Remove trails**: toggles whether the canvas is cleared each frame  
     (Keyboard: press **C** to clear trails.)

**Notes / implementation details**
- The direction of the initial speed is random as is the colour of a new particle.
- Pairwise forces use a softened inverse-square form:  
  `F ∝ (m₁ m₂) / (r² + ε²)`
- Velocity updates are symmetric: each pair contributes equal and opposite impulses.

---

## Julia GIFs (Plots.jl)

These animations are generated frame-by-frame using `Plots.jl` + `Animation()`, then exported as GIFs.

### 3 Body

**What it is:** a three-body gravitational system with trails, rendered on a black background.

**Highlights**
- Deterministic run (`Random.seed!(123)`)
- Softening parameter `ε` to stabilise close encounters
- Trails accumulate over time for each body

**Output:**  
https://laurencewilkes.github.io/Animations/planets/3body/planets.gif

---

### 8 Planets / 12 Planets

**What they are:** N-body variants rendered similarly, with more bodies deterministically placed. 

- **8 Planets:** https://laurencewilkes.github.io/Animations/planets/oct/planets.gif  
- **12 Planets:** https://laurencewilkes.github.io/Animations/planets/oct/planets2.gif

The initial wave of 4 planets are evenly placed on the border of the square with the next four placed twice as far away and (for 12 planets) the next four placed three times away.

---

## DVD (browser)

**What it is:** a DVD bounce style precursor to the Planet Sandbox.

**Link:**  
https://laurencewilkes.github.io/Animations/racecar/dvd/index.html

---

## Snow

**What is it:** a mountain scene at night using standard dynamic HTML.

**Link:**  
https://laurencewilkes.github.io/Animations/snow/index.html
