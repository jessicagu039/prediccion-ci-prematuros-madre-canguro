Commands
========

El `Makefile` contiene las tareas principales del proyecto.

Comandos disponibles
--------------------

- `make requirements`
  - Instala las dependencias Python declaradas en `requirements.txt`.
- `make data`
  - Ejecuta `src/data/make_dataset.py` para construir los conjuntos de datos desde `data/raw` hacia `data/processed`.
- `make clean`
  - Elimina archivos Python compilados y caches (`*.pyc`, `__pycache__`).
- `make lint`
  - Ejecuta `flake8` sobre el paquete `src`.
- `make sync_data_to_s3`
  - Sincroniza `data/` a un bucket S3 configurado con `BUCKET`.
- `make sync_data_from_s3`
  - Descarga `data/` desde S3 al directorio local `data/`.
- `make create_environment`
  - Crea un entorno Python usando conda o virtualenv, según esté disponible.
- `make test_environment`
  - Valida la instalación mínima de Python y dependencias con `test_environment.py`.

Uso
---

```bash
make requirements
make data
```

Asegúrate de configurar `BUCKET` y `PROFILE` en el `Makefile` antes de usar la sincronización con AWS S3.
