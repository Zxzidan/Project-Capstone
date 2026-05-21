import os
import glob

root = r"C:\Users\Dandi\Downloads"
print(f"Listing most recently modified files in {root}...")
try:
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        for filename in filenames:
            full_path = os.path.join(dirpath, filename)
            try:
                mtime = os.path.getmtime(full_path)
                size = os.path.getsize(full_path)
                files.append((full_path, mtime, size))
            except Exception:
                pass
    
    # Sort by mtime descending
    files.sort(key=lambda x: x[1], reverse=True)
    
    for full_path, mtime, size in files[:40]:
        import datetime
        dt = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
        rel_path = os.path.relpath(full_path, root)
        print(f"{dt} - {rel_path} ({size} bytes)")
except Exception as e:
    print(f"Error: {e}")
