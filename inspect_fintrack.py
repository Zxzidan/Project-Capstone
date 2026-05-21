import os

search_root = r"C:\Users\Dandi\Downloads\fintrack-main"
if os.path.exists(search_root):
    print(f"Scanning {search_root}...")
    for dirpath, dirnames, filenames in os.walk(search_root):
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, search_root)
            print(f"{rel_path} ({os.path.getsize(full_path)} bytes)")
else:
    print(f"Directory {search_root} does not exist.")
