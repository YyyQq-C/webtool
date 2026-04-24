
#!/usr/bin/env python3
import sys
import io
from PIL import Image
from rembg import remove

def remove_background(input_path, output_path):
    try:
        with open(input_path, 'rb') as f:
            input_data = f.read()
        output_data = remove(input_data)
        with open(output_path, 'wb') as f:
            f.write(output_data)
        print("Success")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 remove-bg.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    remove_background(sys.argv[1], sys.argv[2])
