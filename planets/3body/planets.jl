using Plots
using Measures   
import Random

a = Animation()

Random.seed!(123)

const n = 3
const G = 6.6743e-11
const t = 0.025

dist2(x1, y1, x2, y2) = (x2 - x1)^2 + (y2 - y1)^2

force(m1, m2, x1, y1, x2, y2; ε = 0.0) = G * m1 * m2 / (dist2(x1, y1, x2, y2) + ε^2)

function dir(x1, y1, x2, y2)
    d = sqrt(dist2(x1, y1, x2, y2))
    return ((x2 - x1) / d, (y2 - y1) / d)
end #function

function updateVelocity!(ms, px, py, vx, vy, ε)
    n = length(px)
    for i in 1:n-1
        for j in i+1:n
            f = force(ms[i], ms[j], px[i], py[i], px[j], py[j], ε = ε)
            dx, dy = dir(px[i], py[i], px[j], py[j])
            vx[i] += t * dx * f / ms[i]
            vy[i] += t * dy * f / ms[i]
            vx[j] -= t * dx * f / ms[j]
            vy[j] -= t * dy * f / ms[j]
        end #for
    end #for
end #function

function updatePosition!(px, py, vx, vy)
    n = length(px)
    for i in 1:n
       px[i] += t * vx[i]
       py[i] += t * vy[i]
    end #for
end #function

#ms = 1e7 * (rand(n) .+ 0.5)

trailx = [Float64[] for _ in 1:n]
traily = [Float64[] for _ in 1:n]

ms = 1e9 * ones(n)
ε = 0.1
px = rand(n) .- 0.5
py = rand(n) .- 0.5
vx = [0. for _ in 1:n]
vy = [0. for _ in 1:n]
for i in 1:2000
    print("$i ")
    updateVelocity!(ms, px, py, vx, vy, ε)
    updatePosition!(px, py, vx, vy)
    for k in 1:n
        push!(trailx[k], px[k])
        push!(traily[k], py[k])
    end #for
    plt = scatter(
        xlims = (-1, 1), ylims = (-1, 1),
        aspect_ratio = 1, size = (1600, 1600),
        margin = 0mm, framestyle = :none, 
        ticks = false, legend = false,
        markersize = 10, markercolor = :white,
        background_color = :black, foreground_color = :black,
    )
    for k in 1:n
        plot!(plt, trailx[k], traily[k],
              linewidth = 2, linecolor = :white, alpha = 0.25,
        )
    end #for
    scatter!(plt, px, py,
             markersize = 10, markercolor = :white,
             markerstrokewidth = 0,
    )
    if !any(i -> -1 ≤ px[i] ≤ 1 && -1 ≤ py[i] ≤ 1, eachindex(px))
        break
    end
    frame(a, plt)
end

gif(a, "planets2.gif", fps = 40)
