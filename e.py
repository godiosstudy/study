# archivo: e.py
import pandas as pd
import uuid

df = pd.read_excel('B2.xlsx')

df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]
df = df[['id', 'version_id', 'version_name', 'language_code', 'testament_id',
         'book_id', 'book_name', 'book_order', 'chapter', 'verse', 'text']]

df.to_csv('biblia_completa.csv', index=False, encoding='utf-8')
print("Listo! 'biblia_completa.csv' generado")