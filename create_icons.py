"""
Script tạo icon chuyên nghiệp cho TrustMeBro extension
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_trust_icon(size):
    """Tạo icon với shield và checkmark"""
    # Tạo image với background trong suốt
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors - Modern gradient colors
    shield_color = (79, 70, 229)  # Indigo
    check_color = (34, 197, 94)   # Green
    accent_color = (147, 51, 234) # Purple
    
    padding = size // 8
    
    # Draw shield shape
    shield_points = [
        (size // 2, padding),  # Top center
        (size - padding, padding + size // 4),  # Top right
        (size - padding, size - padding - size // 6),  # Bottom right
        (size // 2, size - padding),  # Bottom center (point)
        (padding, size - padding - size // 6),  # Bottom left
        (padding, padding + size // 4),  # Top left
    ]
    
    # Draw gradient shield (simulate with multiple layers)
    for i in range(3):
        offset = i * 2
        adjusted_points = [(x + offset if j % 2 == 1 else x - offset, 
                          y + offset if j >= 3 else y - offset) 
                          for j, (x, y) in enumerate(shield_points)]
        color_alpha = 180 - i * 40
        draw.polygon(adjusted_points, 
                    fill=shield_color + (color_alpha,), 
                    outline=accent_color + (200,))
    
    # Draw main shield
    draw.polygon(shield_points, 
                fill=shield_color + (255,), 
                outline=accent_color + (255,))
    
    # Draw checkmark in center
    check_size = size // 3
    check_x = size // 2 - check_size // 4
    check_y = size // 2 - check_size // 6
    
    check_thickness = max(size // 16, 3)
    
    # Checkmark path
    check_points = [
        (check_x, check_y + check_size // 2),
        (check_x + check_size // 3, check_y + check_size * 2 // 3),
        (check_x + check_size, check_y - check_size // 6),
    ]
    
    # Draw thick checkmark
    for offset in range(-check_thickness // 2, check_thickness // 2 + 1):
        adjusted = [(x + offset, y + offset) for x, y in check_points]
        draw.line(adjusted, fill=check_color + (255,), width=check_thickness, joint='curve')
    
    # Add subtle glow effect
    glow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.polygon(shield_points, fill=(255, 255, 255, 30))
    img = Image.alpha_composite(img, glow_img)
    
    return img

def create_all_icons():
    """Tạo tất cả các size icon cần thiết"""
    sizes = [16, 48, 128]
    
    output_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(output_dir, 'icons')
    
    # Tạo thư mục icons nếu chưa có
    os.makedirs(icons_dir, exist_ok=True)
    
    for size in sizes:
        print(f"Creating icon{size}.png...")
        icon = create_trust_icon(size)
        icon.save(os.path.join(icons_dir, f'icon{size}.png'), 'PNG')
    
    print("✅ All icons created successfully!")
    print(f"Icons saved to: {icons_dir}")

if __name__ == '__main__':
    create_all_icons()
