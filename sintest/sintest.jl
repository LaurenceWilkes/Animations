using Plots
using Measures   # for mm

a = Animation()

x = [4π * j / 201 for j in -100:100]

for i in 1:200
    y = sin.(x .+ 2π * i / 200)

    plt = plot(
        x, y,
        xlims = (-1, 1),
        ylims = (-1, 1),
        aspect_ratio = 1,
        size = (1600, 1600),
        margin = 0mm,      
        framestyle = :none, 
        ticks = false,
        legend = false,
        linewidth = 4,
    )

    frame(a, plt)
end

gif(a, "planets.gif", fps = 50)
