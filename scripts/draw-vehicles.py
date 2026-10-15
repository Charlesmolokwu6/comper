# Side-view vehicle illustrations, drawn as SVG and rasterised to transparent PNGs.
DEFS = '''
<defs>
  <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef0f3"/><stop offset="1" stop-color="#c9ced6"/>
  </linearGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a4552"/><stop offset=".5" stop-color="#1c232c"/><stop offset="1" stop-color="#11161c"/>
  </linearGradient>
  <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="rim" cx=".45" cy=".4" r=".7">
    <stop offset="0" stop-color="#f1f3f5"/><stop offset=".6" stop-color="#b8bec7"/><stop offset="1" stop-color="#7d8590"/>
  </radialGradient>
  <radialGradient id="shadow" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
</defs>'''

def wheel(cx, cy, r):
    spokes = "".join(
        f'<line x1="{cx}" y1="{cy}" x2="{cx + r*0.55*__import__("math").cos(a)}" y2="{cy + r*0.55*__import__("math").sin(a)}" stroke="#8d949e" stroke-width="{r*0.09}" stroke-linecap="round"/>'
        for a in [i * 1.2566 for i in range(5)])
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#15191e"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.93}" fill="none" stroke="#2a3038" stroke-width="{r*0.06}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.6}" fill="url(#rim)"/>{spokes}'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.14}" fill="#5d646e"/>')

def svg(inner, w=640, h=300):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{DEFS}{inner}</svg>'

ground = 262
sienna = svg(f'''
<ellipse cx="322" cy="{ground}" rx="290" ry="16" fill="url(#shadow)"/>
<path d="M74,236 L70,156 Q72,108 124,98 L392,92 Q420,92 444,110 L488,146 Q548,154 574,168 Q592,178 590,206 L588,236 L520,236 A46,46 0 0 0 428,236 L214,236 A46,46 0 0 0 122,236 Z" fill="url(#body)" stroke="#aab1bb" stroke-width="1.5"/>
<path d="M98,150 L102,118 Q106,106 128,104 L388,100 Q410,100 428,114 L470,148 Z" fill="url(#glass)"/>
<path d="M98,150 L102,118 Q106,106 128,104 L388,100 Q410,100 428,114 L470,148 Z" fill="url(#shine)"/>
<path d="M206,102 L200,150" stroke="#e7eaee" stroke-width="9"/>
<path d="M318,100 L314,150" stroke="#e7eaee" stroke-width="9"/>
<path d="M412,106 L398,148" stroke="#e7eaee" stroke-width="7"/>
<path d="M76,170 L586,182" stroke="#b9c0c9" stroke-width="2"/>
<path d="M206,152 L204,226 M316,152 L316,226 M400,150 L404,226" stroke="#aeb5bf" stroke-width="2"/>
<path d="M206,160 L316,160" stroke="#9aa2ad" stroke-width="2.5" stroke-linecap="round"/>
<rect x="352" y="168" width="18" height="5" rx="2.5" fill="#9aa2ad"/><rect x="240" y="168" width="18" height="5" rx="2.5" fill="#9aa2ad"/>
<path d="M560,166 Q580,170 586,182 L566,184 Q556,176 560,166 Z" fill="#fdf6d8" stroke="#c9b97a" stroke-width="1"/>
<path d="M72,152 L84,150 L86,186 L74,188 Z" fill="#c8323a"/>
<path d="M440,118 l-12,-2 l-2,10 l14,2 Z" fill="#20262d"/>
<path d="M80,224 L580,224 L582,236 L78,236 Z" fill="#9aa2ad" opacity=".55"/>
{wheel(168, 236, 38)}{wheel(474, 236, 38)}
''')

minibus = svg(f'''
<ellipse cx="322" cy="{ground}" rx="290" ry="16" fill="url(#shadow)"/>
<path d="M72,236 L70,82 Q72,60 96,58 L512,56 Q540,56 550,78 L568,142 Q584,152 584,176 L584,236 L522,236 A44,44 0 0 0 434,236 L210,236 A44,44 0 0 0 122,236 Z" fill="url(#body)" stroke="#aab1bb" stroke-width="1.5"/>
<path d="M92,138 L92,84 Q92,76 102,76 L506,74 Q520,74 526,84 L556,138 Z" fill="url(#glass)"/>
<path d="M92,138 L92,84 Q92,76 102,76 L506,74 Q520,74 526,84 L556,138 Z" fill="url(#shine)"/>
<g stroke="#e7eaee" stroke-width="10"><path d="M178,76 L178,140"/><path d="M268,76 L268,140"/><path d="M358,76 L358,140"/><path d="M440,76 L440,140"/></g>
<path d="M516,78 L500,140" stroke="#e7eaee" stroke-width="8"/>
<path d="M74,154 L582,160" stroke="#b9c0c9" stroke-width="2"/>
<path d="M358,142 L358,226 M440,142 L442,226" stroke="#aeb5bf" stroke-width="2"/>
<path d="M358,148 L440,148" stroke="#9aa2ad" stroke-width="2.5" stroke-linecap="round"/>
<rect x="414" y="168" width="18" height="5" rx="2.5" fill="#9aa2ad"/>
<path d="M564,160 L582,162 L584,184 L566,182 Z" fill="#fdf6d8" stroke="#c9b97a" stroke-width="1"/>
<path d="M72,150 L82,150 L82,192 L72,192 Z" fill="#c8323a"/>
<path d="M548,100 l14,0 l2,14 l-14,0 Z" fill="#20262d"/>
<path d="M78,224 L582,224 L584,236 L76,236 Z" fill="#9aa2ad" opacity=".55"/>
{wheel(166, 236, 36)}{wheel(478, 236, 36)}
''')

win = "".join(f'<path d="M{x},74 L{x},150" stroke="#e7eaee" stroke-width="8"/>' for x in range(130, 520, 66))
bays = "".join(f'<rect x="{x}" y="182" width="{w}" height="36" rx="3" fill="none" stroke="#aeb5bf" stroke-width="2"/>' for x, w in [(214, 70), (292, 70), (370, 70)])
coach = svg(f'''
<ellipse cx="322" cy="{ground}" rx="306" ry="16" fill="url(#shadow)"/>
<path d="M36,238 L34,72 Q36,44 64,42 L576,40 Q604,40 610,66 L616,150 L616,238 L552,238 A40,40 0 0 0 472,238 L194,238 A40,40 0 0 0 114,238 Z" fill="url(#body)" stroke="#aab1bb" stroke-width="1.5"/>
<path d="M56,152 L56,76 Q56,64 70,64 L560,62 L560,152 Z" fill="url(#glass)"/>
<path d="M56,152 L56,76 Q56,64 70,64 L560,62 L560,152 Z" fill="url(#shine)"/>
{win}
<path d="M572,52 L598,52 Q606,54 607,66 L612,198 L572,198 Z" fill="url(#glass)"/>
<path d="M572,52 L598,52 Q606,54 607,66 L612,198 L572,198 Z" fill="url(#shine)"/>
<path d="M566,56 L566,228" stroke="#aeb5bf" stroke-width="2"/>
<rect x="36" y="160" width="580" height="7" fill="#C0F11C"/>
{bays}
<path d="M596,206 L614,206 L614,222 L596,222 Z" fill="#fdf6d8" stroke="#c9b97a" stroke-width="1"/>
<path d="M34,176 L44,176 L44,214 L34,214 Z" fill="#c8323a"/>
<path d="M612,70 q16,4 14,30" fill="none" stroke="#20262d" stroke-width="4" stroke-linecap="round"/>
<path d="M40,226 L614,226 L616,238 L38,238 Z" fill="#9aa2ad" opacity=".55"/>
{wheel(154, 238, 34)}{wheel(512, 238, 34)}
''')
for name, s in [("sienna", sienna), ("minibus", minibus), ("coach", coach)]:
    open(f"{name}.svg", "w").write(s)
print("ok")
