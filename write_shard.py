import os

shard_path = r"c:\Users\Dandi\Desktop\OneDrive\FILE BACKUP\PROJECT CAPSTONE\frontend\tfjs\group1-shard1.bin"
os.makedirs(os.path.dirname(shard_path), exist_ok=True)
with open(shard_path, "wb") as f:
    # 8 bytes of binary zeros (two float32 values of 0.0)
    f.write(b'\x00' * 8)

print("Created group1-shard1.bin successfully with 8 bytes.")
