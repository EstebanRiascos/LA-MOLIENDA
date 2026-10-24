import os
from PIL import Image

def generate_icons():
    src_path = os.path.join('src', 'assets', 'la_molienda_logo.png')
    out_dir = 'build'
    os.makedirs(out_dir, exist_ok=True)
    
    img = Image.open(src_path).convert('RGBA')
    w, h = img.size
    side = max(w, h)
    
    # Crear lienzo transparente cuadrado
    square_img = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    offset = ((side - w) // 2, (side - h) // 2)
    square_img.paste(img, offset, img)
    
    # Guardar PNG de 512x512 y 256x256
    png_256 = square_img.resize((256, 256), Image.Resampling.LANCZOS)
    png_256.save(os.path.join(out_dir, 'icon.png'), format='PNG')
    
    # Guardar ICO multi-tamaño para Windows
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    square_img.save(
        os.path.join(out_dir, 'icon.ico'),
        format='ICO',
        sizes=ico_sizes
    )
    print("Iconos generados exitosamente en 'build/icon.ico' y 'build/icon.png'")

if __name__ == '__main__':
    generate_icons()
