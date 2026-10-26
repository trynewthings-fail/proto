import json, sys, math
src, out = sys.argv[1], sys.argv[2]  # src: a folder with the d3-celestial data files
L = lambda n: json.load(open(src + '/' + n, encoding='utf8'))
st = L('stars.6.json')['features']; nm = L('starnames.json')
stars = []; names = {}
for f in sorted(st, key=lambda f: f['properties']['mag']):
    m = f['properties']['mag']
    if m > 5.3: continue
    ra, de = f['geometry']['coordinates']; ra %= 360
    bv = f['properties'].get('bv') or '0.6'
    try: bv = float(bv)
    except: bv = 0.6
    i = len(stars) // 4
    stars += [round(ra, 2), round(de, 2), round(m, 2), round(bv, 2)]
    n = nm.get(str(f['id']), {}).get('name', '')
    if n and (m < 2.3 or n in ('Polaris', 'Mizar', 'Alcor', 'Mira', 'Thuban', 'Albireo', 'Algol', 'Merak', 'Megrez', 'Phecda', 'Schedar', 'Caph', 'Ruchbah', 'Sadr', 'Alcyone', 'Pleione', 'Kochab', 'Rasalhague', 'Alphecca', 'Zubenelgenubi', 'Hamal', 'Mirach', 'Algieba', 'Denebola', 'Vindemiatrix', 'Sheliak', 'Sulafat', 'Tarazed', 'Alderamin', 'Errai', 'Markab', 'Scheat', 'Algenib', 'Enif', 'Menkar', 'Mintaka', 'Saiph', 'Bellatrix', 'Alnitak', 'Alnilam', 'Meissa', 'Hassaleh', 'Menkalinan', 'Elnath', 'Wasat', 'Mebsuta', 'Tejat', 'Alhena', 'Diphda', 'Ankaa', 'Unukalhai', 'Izar', 'Muphrid', 'Cor Caroli', 'Eltanin', 'Rastaban')):
        names[i] = n
lines = {}
for f in L('constellations.lines.json')['features']:
    lines[f['id']] = [[[round(p[0] % 360, 1), round(p[1], 1)] for p in seg] for seg in f['geometry']['coordinates']]
cons = {}
for f in L('constellations.json')['features']:
    ra, de = f['geometry']['coordinates']
    cons[f['id']] = [round(ra % 360, 1), round(de, 1), int(f['properties']['rank']), f['properties']['name']]
mw = []
for f in L('mw.json')['features']:
    lvl = int(f['id'][2:])
    for poly in f['geometry']['coordinates']:
        for ring in poly:
            step = max(1, len(ring) // max(12, len(ring) // 9))
            r = ring[::step]
            if len(r) < 4: continue
            mw.append([lvl, [v for p in r for v in (round(p[0] % 360, 1), round(p[1], 1))]])
js = 'const SKY=' + json.dumps({'stars': stars, 'names': names, 'lines': lines, 'cons': cons}, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(out, 'w', encoding='utf8').write(js)
print(len(stars)//4, 'stars', len(names), 'names', len(js)//1024, 'KB')
