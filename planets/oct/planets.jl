using Plots
using Measures   

a = Animation()

const n = 8
## const G = 6.6743e-11
const G = 0.04
const t = 0.025

dist2(x1, y1, x2, y2) = (x2 - x1)^2 + (y2 - y1)^2

force(m1, m2, x1, y1, x2, y2) = G * m1 * m2 / dist2(x1, y1, x2, y2)

function dir(x1, y1, x2, y2)
    d = sqrt(dist2(x1, y1, x2, y2))
    return ((x2 - x1) / d, (y2 - y1) / d)
end #function

function updateVelocity!(ms, px, py, vx, vy)
    n = length(px)
    for i in 1:n-1
        for j in i+1:n
            f = force(ms[i], ms[j], px[i], py[i], px[j], py[j])
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

#ms = rand(n) .+ 0.5
#px = rand(n) .- 0.5
#py = rand(n) .- 0.5
#vx = 0.5 .* (rand(n) .- 0.5)
#vy = 0.5 .* (rand(n) .- 0.5)

#ms = [1., 1., 1., 1.]
#px = [-1/3, 1., 1/3, -1.]
#py = [1., 1/3, -1., -1/3]
#vx = [0., -0.2, 0., 0.2]
#vy = [-0.2, 0., 0.2, 0.]


trailx = [Float64[] for _ in 1:n]
traily = [Float64[] for _ in 1:n]

ms = [1. for i in 1:n]
px = [-1/3, 1., 1/3, -1., -2/3, 2., 2/3, -2.]
py = [1., 1/3, -1., -1/3, 2., 2/3, -2., -2/3]
vx = [0., -0.2, 0., 0.2, 0., -0.2, 0., 0.2]
vy = [-0.2, 0., 0.2, 0., -0.2, 0., 0.2, 0.]
for i in 1:400
    print("$i ")
    updateVelocity!(ms, px, py, vx, vy)
    updatePosition!(px, py, vx, vy)
    for k in 1:n
        push!(trailx[k], px[k])
        push!(traily[k], py[k])
    end
    plt = scatter(
        xlims = (-1, 1), ylims = (-1, 1),
        aspect_ratio = 1, size = (1600, 1600),
        margin = 0mm, framestyle = :none,
        ticks = false, legend = false,
        background_color = :black, foreground_color = :black,
    )
    for k in 1:n
        plot!(plt, trailx[k], traily[k], 
              linewidth = 2, linecolor = :white, alpha = 0.25
        )
    end
    scatter!(plt, px, py,
        markersize = 10, markercolor = :white,
        markerstrokewidth = 0
    )

    if !any(i -> 0 ≤ px[i] ≤ 1 && 0 ≤ py[i] ≤ 1, eachindex(px))
        for _ in 1:40
            frame(a, plt)
        end #for
        break
    end
    frame(a, plt)
end

gif(a, "planets.gif", fps = 40)
