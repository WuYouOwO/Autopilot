import math
import struct
import zlib
import binascii
import os

def render_icon(size):
    # Scale from 64x64 coordinate space to target size
    scale = size / 64.0
    
    # Supersampling factor for crisp anti-aliasing
    SS = 4
    ss_size = size * SS
    ss_scale = ss_size / 64.0
    
    # Shapes in 64x64 coordinate space:
    # Cloud circles: (cx, cy, radius)
    circles = [
        (19.0, 34.5, 9.5),   # left bump
        (25.5, 25.5, 11.5),  # mid-left bump
        (33.0, 23.0, 13.0),  # apex bump
        (43.5, 28.0, 11.0),  # mid-right bump
        (47.5, 36.0, 8.0),   # right bump
    ]
    # Cloud base box: (x1, y1, x2, y2)
    box = (19.0, 34.5, 47.5, 44.0)
    
    # Topology nodes in 64x64 space:
    # (cx, cy, r, color_rgb)
    nodes = [
        (22.0, 36.0, 3.2, (255, 255, 255)),   # left node (white)
        (42.0, 36.0, 3.2, (255, 255, 255)),   # right node (white)
        (32.0, 42.0, 3.0, (255, 255, 255)),   # bottom node (white)
        (32.0, 26.0, 3.8, (249, 115, 22)),    # focal apex node (vivid orange #f97316)
    ]
    
    # Edges: ((x1, y1), (x2, y2), thickness)
    edges = [
        ((22.0, 36.0), (32.0, 26.0), 2.2),
        ((32.0, 26.0), (42.0, 36.0), 2.2),
        ((22.0, 36.0), (42.0, 36.0), 2.2),
        ((32.0, 26.0), (32.0, 42.0), 2.2),
    ]

    def dist_point_to_segment(px, py, x1, y1, x2, y2):
        dx = x2 - x1
        dy = y2 - y1
        l2 = dx*dx + dy*dy
        if l2 == 0:
            return math.hypot(px - x1, py - y1)
        t = max(0.0, min(1.0, ((px - x1)*dx + (py - y1)*dy) / l2))
        proj_x = x1 + t * dx
        proj_y = y1 + t * dy
        return math.hypot(px - proj_x, py - proj_y)

    # Pre-render supersampled buffer
    ss_pixels = []
    for sy in range(ss_size):
        row = []
        orig_y = sy / ss_scale
        for sx in range(ss_size):
            orig_x = sx / ss_scale
            
            # Check if in cloud
            in_cloud = False
            if (box[0] <= orig_x <= box[2]) and (box[1] <= orig_y <= box[3]):
                in_cloud = True
            else:
                for cx, cy, r in circles:
                    if (orig_x - cx)**2 + (orig_y - cy)**2 <= r*r:
                        in_cloud = True
                        break
            
            if not in_cloud:
                row.append((0, 0, 0, 0))
                continue
            
            # Cloud background gradient: #0ea5e9 to #0051c3
            # Y range: 10 to 45
            grad_t = max(0.0, min(1.0, (orig_y - 10.0) / 34.0))
            bg_r = int(14 * (1 - grad_t) + 0 * grad_t)
            bg_g = int(165 * (1 - grad_t) + 81 * grad_t)
            bg_b = int(233 * (1 - grad_t) + 195 * grad_t)
            pixel_color = (bg_r, bg_g, bg_b, 255)
            
            # Check edges
            for (x1, y1), (x2, y2), thick in edges:
                d = dist_point_to_segment(orig_x, orig_y, x1, y1, x2, y2)
                if d <= thick / 2.0:
                    pixel_color = (255, 255, 255, 240)
                    break
            
            # Check nodes
            for nx, ny, nr, ncol in nodes:
                d = math.hypot(orig_x - nx, orig_y - ny)
                if d <= nr:
                    pixel_color = (ncol[0], ncol[1], ncol[2], 255)
                    break
            
            row.append(pixel_color)
        ss_pixels.append(row)
        
    # Downsample SS -> target size
    raw = bytearray()
    for y in range(size):
        raw.append(0) # filter byte
        for x in range(size):
            acc_r = acc_g = acc_b = acc_a = 0
            for dy in range(SS):
                for dx in range(SS):
                    r, g, b, a = ss_pixels[y * SS + dy][x * SS + dx]
                    acc_r += r * (a / 255.0)
                    acc_g += g * (a / 255.0)
                    acc_b += b * (a / 255.0)
                    acc_a += a
            
            total_samples = SS * SS
            avg_a = acc_a / total_samples
            if avg_a > 0:
                avg_r = int(acc_r / (avg_a / 255.0 * total_samples))
                avg_g = int(acc_g / (avg_a / 255.0 * total_samples))
                avg_b = int(acc_b / (avg_a / 255.0 * total_samples))
                raw.extend([min(255, max(0, avg_r)), min(255, max(0, avg_g)), min(255, max(0, avg_b)), int(avg_a)])
            else:
                raw.extend([0, 0, 0, 0])

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', binascii.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw), 9)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', compressed) + chunk(b'IEND', b'')

def build_ico(png_data, size=32):
    # ICO header: 6 bytes
    # idReserved=0, idType=1 (icon), idCount=1
    header = struct.pack('<HHH', 0, 1, 1)
    # Entry: bWidth, bHeight, bColorCount, bReserved, wPlanes, wBitCount, dwBytesInRes, dwImageOffset
    entry = struct.pack('<BBBBHHII', size if size < 256 else 0, size if size < 256 else 0, 0, 0, 1, 32, len(png_data), 6 + 16)
    return header + entry + png_data

def main():
    public_dir = '/root/workspace/Autopilot/public'
    os.makedirs(public_dir, exist_ok=True)
    
    print("Rendering 32x32 favicon...")
    png_32 = render_icon(32)
    with open(os.path.join(public_dir, 'favicon-32x32.png'), 'wb') as f:
        f.write(png_32)
        
    ico_data = build_ico(png_32, 32)
    with open(os.path.join(public_dir, 'favicon.ico'), 'wb') as f:
        f.write(ico_data)
        
    print("Rendering 180x180 apple-touch-icon...")
    png_180 = render_icon(180)
    with open(os.path.join(public_dir, 'apple-touch-icon.png'), 'wb') as f:
        f.write(png_180)

    print("Rendering 192x192 PWA icon...")
    png_192 = render_icon(192)
    with open(os.path.join(public_dir, 'icon-192.png'), 'wb') as f:
        f.write(png_192)

    print("Rendering 512x512 PWA icon...")
    png_512 = render_icon(512)
    with open(os.path.join(public_dir, 'icon-512.png'), 'wb') as f:
        f.write(png_512)
        
    # Copy logo.svg to favicon.svg
    with open(os.path.join(public_dir, 'logo.svg'), 'rb') as src, open(os.path.join(public_dir, 'favicon.svg'), 'wb') as dst:
        dst.write(src.read())

    print("All icons generated successfully in", public_dir)

if __name__ == '__main__':
    main()
