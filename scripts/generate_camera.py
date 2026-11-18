"""Create the unbranded low-poly portfolio camera. Python standard library only.

Y up, lens faces +Z, feet at Y=0. Geometry is batched by material; PNG texture
is embedded in the GLB. This is a stylized display prop, not a real camera model.
Run from any directory: python scripts/generate_camera.py
"""
import json
import math
import struct
import zlib
from pathlib import Path

OUTPUT = Path(__file__).resolve().parents[1] / 'public/models/portfolio-camera.glb'
MATERIALS = [
    ('body', '#343d49', .25, .65), ('grip', '#ffffff', .05, .95),
    ('metal', '#b9c8ce', .65, .35), ('rubber', '#101722', .05, .8),
    ('cyan', '#53d9ed', .35, .25), ('pink', '#ff4da6', .25, .35),
    ('glass', '#17485d', .7, .16), ('iris', '#081a2c', .4, .18),
]
parts = []


def box(name, center, size, material):
    vertices = [tuple(center[j] + point[j] * size[j] / 2 for j in range(3))
                for point in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),
                              (-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
    parts.append((name, vertices, faces, material))


def cylinder(name, center, radius, length, material, axis='z', sides=12):
    vertices = []
    for depth in [-length / 2, length / 2]:
        for i in range(sides):
            angle = i * 2 * math.pi / sides
            p = [radius * math.cos(angle), radius * math.sin(angle), depth]
            if axis == 'y':
                p = [p[0], p[2], -p[1]]
            vertices.append(tuple(center[j] + p[j] for j in range(3)))
    faces = [tuple(reversed(range(sides))), tuple(range(sides, sides * 2))]
    faces += [(i, (i+1) % sides, (i+1) % sides + sides, i+sides) for i in range(sides)]
    parts.append((name, vertices, faces, material))


def rgb(value):
    # glTF baseColor factors are linear, unlike hex/sRGB display colors.
    channels = [int(value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels]


def pixel_texture():
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    pixels = bytearray()
    for y in range(16):
        pixels.append(0)  # PNG row filter: none
        for x in range(16):
            shade = 31 + (9 if (x // 2 + y // 2) % 2 else 0) + (5 if x % 4 == y % 4 == 0 else 0)
            pixels.extend((shade, shade + 6, shade + 12))
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 16, 16, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(pixels))) + chunk(b'IEND', b''))


def make_camera():
    box('camera chassis', (0,.48,0), (1.75,.84,.58), 'body')
    box('silver top plate', (0,.91,0), (1.77,.10,.62), 'metal')
    box('bottom plate', (0,.065,0), (1.75,.09,.60), 'rubber')
    for x in [-.62,.62]:
        box('rubber foot', (x,.01,0), (.25,.02,.4), 'rubber')
    box('textured grip', (.68,.47,.16), (.38,.76,.53), 'grip')
    box('front leatherette', (-.57,.47,.30), (.49,.64,.035), 'grip')
    box('rear leatherette', (0,.46,-.305), (1.53,.63,.035), 'grip')
    box('viewfinder housing', (-.13,1.035,0), (.55,.23,.47), 'body')
    box('viewfinder roof', (-.13,1.17,-.01), (.42,.06,.39), 'metal')
    box('hot shoe', (-.13,1.215,-.02), (.24,.03,.23), 'rubber')
    box('viewfinder rear glass', (-.13,1.04,-.255), (.28,.11,.04), 'glass')
    box('viewfinder front window', (-.13,1.04,.245), (.25,.09,.025), 'iris')
    cylinder('mode dial', (-.61,1.01,-.02), .17, .12, 'rubber', 'y')
    cylinder('dial top', (-.61,1.077,-.02), .13, .018, 'metal', 'y')
    box('mode marker', (-.61,1.09,.055), (.025,.012,.08), 'pink')
    cylinder('shutter collar', (.66,.99,.18), .11, .08, 'rubber', 'y')
    cylinder('shutter button', (.66,1.04,.18), .075, .025, 'metal', 'y')
    cylinder('control dial', (.56,.99,-.15), .12, .07, 'body', 'y')
    box('status LED', (.38,.78,.305), (.06,.035,.015), 'pink')
    for x in [-.92,.92]:
        box('strap lug', (x,.76,0), (.11,.13,.13), 'metal')
        box('lug insert', (x,.76,.07), (.045,.055,.015), 'rubber')
    # Twelve-sided stepped lens and focus ribs keep the silhouette intentionally faceted.
    for name, z, radius, length, mat in [
        ('lens mount', .32,.48,.10,'metal'), ('barrel', .54,.43,.40,'rubber'),
        ('accent band', .69,.445,.035,'pink'), ('front barrel', .765,.42,.12,'body'),
        ('filter rim', .833,.433,.035,'metal'), ('inner rim', .855,.392,.025,'rubber'),
        ('lens glass', .873,.343,.018,'glass'), ('iris', .885,.244,.012,'iris'),
    ]:
        cylinder(name, (-.13,.53,z), radius, length, mat)
    for z in [.40,.46,.52,.58]:
        cylinder('focus rib', (-.13,.53,z), .452, .023, 'body')
    cylinder('cyan glass reflection', (-.13,.53,.894), .12, .008, 'glass', sides=8)
    box('pixel highlight', (-.29,.69,.891), (.13,.05,.008), 'cyan')
    box('pixel highlight small', (-.35,.63,.891), (.05,.06,.008), 'metal')
    # Rear LCD is an abstract pixel motif, not a placeholder photograph.
    box('LCD frame', (-.16,.46,-.34), (1.03,.57,.04), 'rubber')
    box('LCD screen', (-.16,.46,-.365), (.9,.45,.012), 'iris')
    for i in range(7):
        box('LCD pixel', (-.49 + i*.105,.34 + (i % 3)*.06,-.378), (.08,.035,.01), 'cyan')
    for y in [.37,.55,.70]:
        box('rear button', (.59,y,-.34), (.09,.07,.05), 'metal')


def export():
    blob = bytearray()
    views, accessors, meshes = [], [], []
    def buffer(data):
        blob.extend(b'\0' * (-len(blob) % 4))
        views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)})
        blob.extend(data)
        return len(views) - 1
    def attribute(values, width, bounds=False):
        view = buffer(struct.pack('<' + 'f' * len(values), *values))
        item = {'bufferView': view, 'componentType': 5126, 'count': len(values)//width, 'type': f'VEC{width}'}
        if bounds:
            item.update(min=[min(values[i::width]) for i in range(width)], max=[max(values[i::width]) for i in range(width)])
        accessors.append(item)
        return len(accessors) - 1
    for material_index, (material, *_rest) in enumerate(MATERIALS):
        positions, normals, uvs = [], [], []
        for _name, vertices, faces, mat in parts:
            if mat != material:
                continue
            for face in faces:
                a,b,c = [vertices[i] for i in face[:3]]
                u,v = [b[i]-a[i] for i in range(3)], [c[i]-a[i] for i in range(3)]
                n = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                length = math.sqrt(sum(x*x for x in n))
                n = [x / length for x in n]
                for k in range(1, len(face)-1):
                    for j in (0,k,k+1):
                        positions.extend(vertices[face[j]])
                        normals.extend(n)
                        uvs.extend([(0,0),(1,0),(1,1),(0,1)][j % 4])
        meshes.append({'name': material, 'primitives': [{'attributes': {
            'POSITION': attribute(positions, 3, True), 'NORMAL': attribute(normals, 3),
            'TEXCOORD_0': attribute(uvs, 2)}, 'material': material_index}]})
    texture_view = buffer(pixel_texture())
    materials = []
    for name, color, metallic, roughness in MATERIALS:
        pbr = {'baseColorFactor': [*rgb(color),1], 'metallicFactor': metallic, 'roughnessFactor': roughness}
        if name == 'grip':
            pbr['baseColorTexture'] = {'index': 0}
        item = {'name': name, 'pbrMetallicRoughness': pbr}
        if name in ('cyan', 'pink'):
            item['emissiveFactor'] = [c * .25 for c in rgb(color)]
        materials.append(item)
    doc = {'asset': {'version': '2.0', 'generator': 'After Hours stylized camera / stdlib'},
           'scene': 0, 'scenes': [{'nodes': list(range(len(meshes)))}],
           'nodes': [{'name': 'camera-' + m['name'], 'mesh': i} for i,m in enumerate(meshes)],
           'meshes': meshes, 'materials': materials, 'buffers': [{'byteLength': len(blob)}],
           'bufferViews': views, 'accessors': accessors,
           'images': [{'bufferView': texture_view, 'mimeType': 'image/png'}],
           'samplers': [{'magFilter': 9728, 'minFilter': 9728, 'wrapS': 10497, 'wrapT': 10497}],
           'textures': [{'source': 0, 'sampler': 0}]}
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    blob.extend(b'\0' * (-len(blob) % 4))
    result = (struct.pack('<III', 0x46546c67, 2, 28+len(encoded)+len(blob))
              + struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
              + struct.pack('<II', len(blob), 0x004e4942) + blob)
    assert struct.unpack_from('<I', result, 8)[0] == len(result)
    assert all(v['byteOffset'] + v['byteLength'] <= len(blob) for v in views)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(result)
    triangles = sum(a['count'] for a in accessors if a['type'] == 'VEC3' and 'min' in a) // 3
    print(f'{OUTPUT.name}: {len(result):,} bytes, {len(meshes)} material batches, {triangles} triangles, embedded 16x16 texture')


if __name__ == '__main__':
    make_camera()
    export()
