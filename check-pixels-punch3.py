from PIL import Image
img = Image.open('test-punch3.png')
print("Pixel at 50,50 (outside punch):", img.getpixel((50, 50)))
print("Pixel at 150,150 (inside punch):", img.getpixel((150, 150)))
