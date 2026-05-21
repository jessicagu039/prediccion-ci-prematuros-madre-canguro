import json
from pathlib import Path
root = Path('notebooks/clustering-models')
for nb in ['Clustering_CVLT_GOi_v1.ipynb','Clustering_TAP_GOi_v1.ipynb','Clustering_WASI_GOi_v1.ipynb']:
    data = json.loads((root/nb).read_text(encoding='utf-8'))
    print('NB', nb)
    for cell in data['cells']:
        if cell['cell_type']!='code':
            continue
        src = ''.join(cell['source'])
        if 'label_and_characterise' in src:
            print('CELL with label_and_characterise')
            for i,line in enumerate(src.splitlines()):
                print(f'{i:03d}: {line}')
            print('===')
    print('=== NB END ===')
