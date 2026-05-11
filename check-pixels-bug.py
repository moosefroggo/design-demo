from PIL import Image
img = Image.open('test-bug.png')
print("Pixel at 50,50 (outside, should be red):", img.getpixel((50, 50)))
print("Pixel at 400,300 (inside circle, should be blue):", img.getpixel((400, 300)))
