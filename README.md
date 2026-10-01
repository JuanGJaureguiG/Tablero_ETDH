# Tablero ETDH · Técnicos Laborales — UNIMINUTO Sede Tolima-Huila

Tablero interactivo con el histórico (2020–2025) de estudiantes e ingresos de los programas de
Educación para el Trabajo y el Desarrollo Humano (técnicos laborales e idiomas) de la Sede Tolima-Huila.

## Archivos
| Archivo | Uso |
|---|---|
| `index.html` | Estructura del tablero |
| `styles.css` | Estilos (sistema visual de los tableros STH) |
| `app.js` | Filtros, gráficos (Chart.js 4.4.1) y tablas |
| `data.json` | Datos agregados por programa y año — sin información personal |
| `build_data.py` | Regenera `data.json` desde el export SAP en Excel |

## Actualizar datos
1. Exportar desde SAP el Excel con columnas `Año | Programa | Ingresos | Estudiantes`.
2. `python build_data.py Histórico_Técnicos_Laborales_UNIMINUTO.xlsx`
3. Subir el nuevo `data.json` al repositorio (Add file → Upload files), reemplazando el anterior.

Si SAP trae un programa nuevo, agregue su nombre abreviado al diccionario `NOMBRES` de `build_data.py`.
