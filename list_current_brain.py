import os

root = r"C:\Users\Dandi\.gemini\antigravity-ide\brain\99c20a83-1208-41b3-889c-8ec9c0052fbb"
print(f"Scanning {root} for files...")
if os.path.exists(root):
    for dirpath, dirnames, filenames in os.walk(root):
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root)
            print(f"{rel_path} ({os.path.getsize(full_path)} bytes)")
else:
    print(f"Directory {root} does not exist.")
