import os
from PIL import Image, ImageDraw, ImageFilter

def process_images():
    dir_path = 'frontend/src/assets/howto'
    logo_path = 'frontend/src/assets/logo-cropped-tight.png'
    
    if not os.path.exists(logo_path):
        print("Logo not found at:", logo_path)
        return
        
    logo = Image.open(logo_path).convert("RGBA")
    
    # Define the regions to mask and the background color to paint
    # And the coordinates to place the new Kovidam logo
    modifications = {
        'step_signup.png': {
            'mask_rect': (51, 35, 220, 62),
            'bg_color': (8, 14, 26, 255),
            'logo_pos': (51, 32),
            'logo_height': 30
        },
        'step_dashboard.png': {
            'mask_rect': (50, 140, 180, 182),
            'bg_color': (9, 17, 30, 255),
            'logo_pos': (50, 142),
            'logo_height': 36
        },
        'step_upload.png': {
            'mask_rect': (410, 68, 615, 95),
            'bg_color': (6, 14, 27, 255),
            'logo_pos': (480, 65), # Centered slightly
            'logo_height': 32
        },
        'step_configure.png': {
            'mask_rect': (35, 20, 352, 52),
            'bg_color': (13, 19, 31, 255),
            'logo_pos': (35, 22),
            'logo_height': 28
        },
        'step_evaluating.png': {
            'mask_rect': (35, 20, 220, 55),
            'bg_color': (7, 14, 28, 255),
            'logo_pos': (35, 22),
            'logo_height': 30
        },
        'step_results.png': {
            'mask_rect': (58, 175, 305, 205),
            'bg_color': (6, 13, 26, 255),
            'logo_pos': (58, 175),
            'logo_height': 28
        }
    }
    
    for filename, cfg in modifications.items():
        img_path = os.path.join(dir_path, filename)
        if not os.path.exists(img_path):
            print(f"Skipping {filename} (not found)")
            continue
            
        img = Image.open(img_path).convert("RGBA")
        draw = ImageDraw.Draw(img)
        
        # 1. Mask out the old brand name
        draw.rectangle(cfg['mask_rect'], fill=cfg['bg_color'])
        
        # 2. Resize and paste the Kovidam logo
        h = cfg['logo_height']
        w = int(logo.width * (h / logo.height))
        resized_logo = logo.resize((w, h), Image.Resampling.LANCZOS)
        
        # Paste using logo's alpha channel as mask
        img.paste(resized_logo, cfg['logo_pos'], resized_logo)
        
        # Save back the image
        img.convert("RGB").save(img_path, "PNG")
        print(f"Successfully processed {filename}")

if __name__ == "__main__":
    process_images()
