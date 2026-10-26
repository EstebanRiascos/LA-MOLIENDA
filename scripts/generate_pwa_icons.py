import os
from PIL import Image

def generate_pwa_icons():
    src_path = os.path.join('src', 'assets', 'la_molienda_logo.png')
    public_dir = 'public'
    os.makedirs(public_dir, exist_ok=True)
    
    img = Image.open(src_path).convert('RGBA')
    w, h = img.size
    side = max(w, h)
    
    # Crear lienzo transparente cuadrado centrado
    square_img = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    offset = ((side - w) // 2, (side - h) // 2)
    square_img.paste(img, offset, img)
    
    # 1. 192x192 PNG (Standard PWA)
    img_192 = square_img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join(public_dir, 'pwa-192x192.png'), format='PNG')
    
    # 2. 512x512 PNG (High-Res PWA)
    img_512 = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(public_dir, 'pwa-512x512.png'), format='PNG')
    
    # 3. 180x180 Apple Touch Icon (iOS Safari)
    apple_icon = square_img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save(os.path.join(public_dir, 'apple-touch-icon.png'), format='PNG')
    
    # 4. 512x512 Maskable Icon (Android Adaptive Icon con fondo oscuro y 80% zona segura)
    bg_color = (14, 11, 8, 255) # #0e0b08
    maskable = Image.new('RGBA', (512, 512), bg_color)
    target_inner_size = int(512 * 0.78)
    inner_logo = square_img.resize((target_inner_size, target_inner_size), Image.Resampling.LANCZOS)
    mask_offset = ((512 - target_inner_size) // 2, (512 - target_inner_size) // 2)
    maskable.paste(inner_logo, mask_offset, inner_logo)
    maskable.save(os.path.join(public_dir, 'pwa-maskable-512x512.png'), format='PNG')
    
    print("Íconos PWA generados con éxito en la carpeta 'public/':")
    print(" - public/pwa-192x192.png")
    print(" - public/pwa-512x512.png")
    print(" - public/pwa-maskable-512x512.png")
    print(" - public/apple-touch-icon.png")

if __name__ == '__main__':
    generate_pwa_icons()
