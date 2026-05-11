from PIL import Image
img = Image.open('test-clip-anim.png')
print("Center pixel:", img.getpixel((img.width // 2, img.height // 2)))
print("Top-left pixel:", img.getpixel((10, 10)))
