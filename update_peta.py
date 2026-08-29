import re

with open("src/routes/peta.tsx", "r") as f:
    content = f.read()

# 1. Update body wrapper
content = content.replace(
    '<div className="relative flex-1 overflow-hidden">',
    '<div className="relative flex-1 overflow-hidden flex flex-col lg:block">'
)

# 2. Update main wrapper
content = content.replace(
    '<main className="absolute inset-0 bg-muted/10 print:static print:w-full">',
    '<main className="relative shrink-0 h-[45vh] z-0 bg-muted/10 lg:absolute lg:inset-0 lg:h-auto print:static print:w-full">'
)

# 3. Extract toggle sidebar and legend
legend_regex = r"(\s*{/\* Floating: Toggle Sidebar.*?</div>\s*</div>\s*</div>)"
match = re.search(legend_regex, content, re.DOTALL)
if match:
    legend_block = match.group(1)
    # Remove it from the end (before </main>)
    content = content.replace(legend_block + "\n        </main>", "")
    
    # Hide legend on mobile
    legend_block = legend_block.replace(
        '<div className="absolute bottom-4 right-4',
        '<div className="hidden lg:block absolute bottom-4 right-4'
    )
    # Hide toggle on mobile
    legend_block = legend_block.replace(
        'className="absolute bottom-[80px]',
        'className="hidden lg:flex lg:pointer-events-auto absolute bottom-[80px]'
    )
    
    # Insert it right before CARD 1, and close main, then open cards wrapper
    insert_point = '{/* CARD 1: Role Selector (Bottom Center) */}'
    replacement_block = f"""{legend_block}
        </main>

        {{/* CARDS AREA (Scrollable block on mobile, overlay on desktop) */}}
        <div className="flex-1 overflow-y-auto bg-background p-4 flex flex-col gap-4 lg:pointer-events-none lg:absolute lg:inset-0 lg:overflow-visible lg:p-0 lg:bg-transparent">

          {insert_point}"""
    content = content.replace("          " + insert_point, replacement_block)

# 4. Update CARD 1 wrapper
content = content.replace(
    'className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-white/90 p-1 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 print:hidden"',
    'className="lg:pointer-events-auto flex items-center justify-center gap-1 rounded-xl bg-white/90 p-1 shadow-lg backdrop-blur-xl border border-border/20 dark:bg-black/80 dark:border-white/10 print:hidden lg:absolute lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-auto"'
)

# 5. Update RIGHT CARDS wrapper
content = content.replace(
    '"absolute top-4 right-4 z-40 flex max-h-[calc(100%-140px)] w-[300px] flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden"',
    '"lg:pointer-events-auto flex flex-col gap-3 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:hidden",\n            "lg:absolute lg:top-4 lg:right-4 lg:z-40 lg:w-[300px] lg:max-h-[calc(100%-140px)]"'
)
content = content.replace(
    'isMapMaximized ? "right-[-400px] opacity-0" : "opacity-100"',
    'isMapMaximized ? "lg:right-[-400px] lg:opacity-0" : "lg:opacity-100"'
)

# 6. Update LEFT CARDS wrapper
content = content.replace(
    '"absolute top-4 left-4 z-40 flex max-h-[calc(100vh-32px)] w-[320px] flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:static print:w-full"',
    '"lg:pointer-events-auto flex flex-col gap-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] print:static print:w-full",\n            "lg:absolute lg:top-4 lg:left-4 lg:z-40 lg:w-[320px] lg:max-h-[calc(100vh-32px)]"'
)
content = content.replace(
    'isMapMaximized ? "left-[-400px] opacity-0" : "opacity-100"',
    'isMapMaximized ? "lg:left-[-400px] lg:opacity-0" : "lg:opacity-100"'
)

# Close the new cards wrapper at the end
content = content.replace(
    '      </div>\n    </div>\n  );\n}',
    '        </div>\n      </div>\n    </div>\n  );\n}'
)

with open("src/routes/peta.tsx", "w") as f:
    f.write(content)
