
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
        return True
    except Exception as e:
        raise RuntimeError(str(e))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 remove_bg.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)
    try:
        remove_background(sys.argv[1], sys.argv[2])
    except Exception as err:
        print(f"Error: {str(err)}", file=sys.stderr)
        sys.exit(1)
