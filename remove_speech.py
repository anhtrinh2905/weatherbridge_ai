import os

file_path = 'be/src/api/v1/router.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if 'speech,' in line:
        continue
    if 'router.include_router(speech.router' in line:
        continue
    new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
