from PIL import Image
img = Image.open('test-drop-shadow.png')
print("Center pixel (inside diamond, should be blue):", img.getpixel((400, 300)))
print("Outside top-left of diamond (should be shadowed gray):", img.getpixel((300, 200)))
print("Far away pixel (should be original gray #ccc):", img.getpixel((50, 50)))
