import os

root_dir = r"c:\Users\Dandi\Desktop\OneDrive\FILE BACKUP\PROJECT CAPSTONE"
ignore_dirs = {".git", "node_modules"}

print("Scanning all files in workspace...")
found_files = []
for dirpath, dirnames, filenames in os.walk(root_dir):
    # prune ignored directories in-place
    dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
    
    for filename in filenames:
        full_path = os.path.join(dirpath, filename)
        rel_path = os.path.relpath(full_path, root_dir)
        found_files.append((rel_path, os.path.getsize(full_path)))

# Sort by name
found_files.sort()
for rel_path, size in found_files:
    print(f"{rel_path} ({size} bytes)")
