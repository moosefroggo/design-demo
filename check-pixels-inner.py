from PIL import Image
img = Image.open('test-inner.png')
print("Center pixel (inside, should be white #eee):", img.getpixel((img.width//2, img.height//2)))
print("Border pixel inside edge (should be dark/shadowed):", img.getpixel((img.width//2, int(img.height*0.1) + 5)))
print("Far away pixel (should be original dark #222):", img.getpixel((50, 50)))
