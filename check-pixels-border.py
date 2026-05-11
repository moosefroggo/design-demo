from PIL import Image
img = Image.open('test-border.png')
print("Center pixel (inside, should be white #eee):", img.getpixel((img.width//2, img.height//2)))
print("Border pixel roughly top-mid (should be red #f00):", img.getpixel((img.width//2, int(img.height*0.1))))
