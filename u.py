# archivo: cargar_biblia_completa.py
import pandas as pd
import uuid

# CARGAR TU EXCEL COMPLETO
df = pd.read_excel('B2.xlsx')  # ← TU ARCHIVO

# GENERAR UUID ÚNICO
df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]

# ASEGURAR TIPOS
df['chapter'] = df['chapter'].astype(int)
df['verse'] = df['verse'].astype(int)
df['book_order'] = df['book_order'].astype(int)

# GENERAR INSERTs
inserts = []
for _, row in df.iterrows():
    text_escaped = str(row['text']).replace("'", "''")
    insert = f"""
    INSERT INTO verses (
      id, version_id, version_name, language_code, testament_id,
      book_id, book_name, book_order, chapter, verse, text
    ) VALUES (
      '{row['id']}', '{row['version_id']}', '{row['version_name']}', '{row['language_code']}', '{row['testament_id']}',
      '{row['book_id']}', '{row['book_name']}', {row['book_order']}, {row['chapter']}, {row['verse']}, '{text_escaped}'
    );
    """
    inserts.append(insert)

# GUARDAR
with open('biblia_completa.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(inserts))

print(f"¡LISTO! {len(inserts)} versículos generados en 'biblia_completa.sql'")
print("Ejecuta en Supabase SQL Editor")