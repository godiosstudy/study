# STUDY — Navegador de Biblias Auténticas

**Dominio:** `study.godios.org`  
**Frontend:** React + Vite  
**Backend / DB:** Supabase (PostgreSQL + Auth + Real-time)  
**Estado actual:** [PLANIFICACIÓN] | [EN DESARROLLO] | [MVP] | [PRODUCCIÓN]  
**Fecha de inicio:** 26/10/2025  
**Propietario:** [Tu nombre]

---

## VISIÓN GENERAL

Una aplicación web para navegar múltiples versiones de la Biblia de forma **auténtica** (sin traducción automática del texto bíblico), con:

- Búsqueda en tiempo real  
- Navegación por testamento, libro, capítulo  
- Autenticación de usuarios  
- Favoritos y notas personales  
- Interfaz en 5 idiomas (UI)  
- Colaboración en tiempo real (futuro)

> **Importante:** Los versículos y nombres de libros se mantienen en su idioma original.  
> Solo la interfaz (botones, menús, placeholders) se traduce.

---

## OBJETIVOS

| Objetivo | Prioridad |
|---------|----------|
| MVP funcional en `study.godios.org` | Alta |
| Búsqueda en tiempo real | Alta |
| Autenticación segura | Alta |
| Soporte 5 idiomas (UI) | Media |
| Favoritos y perfil | Media |
| Escalabilidad (10k+ usuarios) | Baja (futura) |

---

## REQUISITOS FUNCIONALES (MVP)

| # | Funcionalidad | Estado |
|---|---------------|--------|
| 1 | Búsqueda en tiempo real (live search) | [ ] |
| 2 | Navegación: Testamento → Libro → Capítulo → Versículo | [ ] |
| 3 | Soporte para múltiples versiones (Reina Valera, NIV, etc.) | [ ] |
| 4 | Autenticación: login, registro, forgot password | [ ] |
| 5 | Perfil de usuario: nombre, idioma preferido | [ ] |
| 6 | Guardar versículos favoritos | [ ] |
| 7 | Interfaz en 5 idiomas (ES, EN, FR, PT, IT) | [ ] |
| 8 | Despliegue en `study.godios.org` | [ ] |

---

## REQUISITOS TÉCNICOS

| Área | Tecnología | Justificación |
|------|------------|---------------|
| Frontend | React + Vite | Rápido, modular, escalable |
| Hosting | Vercel | Deploy automático, CDN global |
| Base de datos | Supabase (PostgreSQL) | Serverless, real-time, auth |
| Búsqueda | Full-text search (tsvector + GIN) | Rápida y escalable |
| Internacionalización | i18next | Estándar, flexible |
| Autenticación | Supabase Auth UI | Listo para usar, seguro |
| Estado | Context API / Zustand | Simple y efectivo |

---

## ESTRUCTURA DE CARPETAS (Planificada)
study/
├── public/                  # Íconos, favicon
├── src/
│   ├── assets/              # CSS, imágenes
│   ├── components/          # Reutilizables
│   │   ├── Layout/          # Header, Footer
│   │   ├── Bible/           # SearchBar, Navigator, VerseCard
│   │   ├── Auth/            # Login, Register, Profile
│   │   └── UI/              # Button, Input, Modal
│   ├── contexts/            # AuthContext, ThemeContext
│   ├── hooks/               # useLiveSearch, useAuth
│   ├── i18n/                # i18n.js + locales/
│   ├── pages/               # Home, Profile
│   ├── services/            # supabase.js
│   ├── utils/               # debounce, formatVerse
│   └── App.jsx
├── .env                     # Variables de entorno
├── vite.config.js
├── package.json
└── PROJECT.md               # ESTE ARCHIVO

---

## BASE DE DATOS (Supabase)

### Tablas

| Tabla | Columnas | Notas |
|------|----------|-------|
| `verses` | `id`, `version`, `language`, `book`, `chapter`, `verse`, `text`, `search_text` | `search_text` = `to_tsvector` |
| `profiles` | `id` (uuid), `full_name`, `preferred_language`, `avatar_url` | Extensión de `auth.users` |
| `favorites` | `user_id`, `verse_id` | Relación muchos a muchos |

### Índices
- `verses_search_idx` → `GIN(search_text)`

---

## INTERNACIONALIZACIÓN (i18n)

### Idiomas soportados
- Español (ES) — default  
- Inglés (EN)  
- Francés (FR)  
- Portugués (PT)  
- Italiano (IT)

### Archivos
src/i18n/locales/
├── es/translation.json
├── en/translation.json
├── fr/translation.json
├── pt/translation.json
└── it/translation.json
text> Solo UI. **No se traduce el texto bíblico.**

---

## AUTENTICACIÓN

| Flujo | Herramienta |
|------|-------------|
| Login / Registro | Supabase Auth UI |
| Forgot password | Email automático |
| Perfil | `user_profile` view |
| Seguridad | RLS + JWT |

---

## DESPLIEGUE

| Plataforma | URL | DNS |
|-----------|-----|-----|
| Vercel | `study.vercel.app` → `study.godios.org` | CNAME: `study` → `cname.vercel-dns.com` |

---

## TASK BOARD (Kanban)

### A Hacer
- [ ] Crear proyecto `study` con Vite
- [ ] Configurar Supabase
- [ ] Crear tabla `verses`
- [ ] Implementar búsqueda en tiempo real
- [ ] Configurar i18next
- [ ] Implementar autenticación
- [ ] Desplegar en Vercel
- [ ] Configurar DNS

### En Progreso
- [ ]

### Hecho
- [ ] Documentación inicial (`PROJECT.md`)

---

## CHANGELOG

| Fecha       | Acción                                      | Responsable |
|-------------|---------------------------------------------|-------------|
| 26/10/2025  | Creación de `PROJECT.md` — planificación    | [Tú]        |
|             |                                             |             |

---

## PRÓXIMA ACCIÓN

> **Crear el proyecto `study` con Vite + React**  
> ```bash
> npm create vite@latest study -- --template react
> ```

---

## REGLAS DE ORO

1. **Este archivo es la fuente de verdad**  
2. **Actualízalo cada vez que hagas algo**  
3. **Mueve tareas: A Hacer → En Progreso → Hecho**  
4. **Agrega una línea al Changelog**  
5. **Commit con mensaje claro**

---

**Este archivo es tu mapa. Tu brújula. Tu control total.**

### Hecho
- [x] Documentación inicial (`PROJECT.md`)
- [x] Crear proyecto `study` con Vite + React
- [x] Instalar dependencias base
- [x] `npm run dev` funcional

### En Progreso
- [ ] Configurar Supabase

### A Hacer
- [ ] Crear proyecto en Supabase
- [ ] Crear archivo `.env`
- [ ] Crear `src/services/supabase.js`
- [ ] Crear tabla `verses` en Supabase
- [ ] Implementar búsqueda en tiempo real
- [ ] Configurar i18next
- [ ] Implementar autenticación
- [ ] Desplegar en Vercel
- [ ] Configurar DNS

## CHANGELOG

| Fecha       | Acción                                      | Responsable |
|-------------|---------------------------------------------|-------------|
| 26/10/2025  | Creación de `PROJECT.md` — planificación    | [Tú]        |
| 26/10/2025  | Proyecto `study` creado con Vite + React    | [Tú]        |
| 26/10/2025  | Dependencias instaladas                     | [Tú]        |

Project API
Your API is secured behind an API gateway which requires an API Key for every request.
You can use the parameters below to use Supabase client libraries.

Project URL
https://jxngyfctlilataxuqvnw.supabase.co

Copy
A RESTful endpoint for querying and managing your database.
API Key

anon
public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bmd5ZmN0bGlsYXRheHVxdm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTcyMjEsImV4cCI6MjA3NzA3MzIyMX0.hZd1z-3ncAP--5MsMfsLOLTpQIM7IJ3gkwkdO9_l8j8

Copy
This key is safe to use in a browser if you have enabled Row Level Security (RLS) for your tables and configured policies. You may also use the service key which can be found here to bypass RLS.

Javascript
Dart
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jxngyfctlilataxuqvnw.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

### Hecho
- [x] Documentación inicial (`PROJECT.md`)
- [x] Crear proyecto `study` con Vite + React
- [x] Instalar dependencias base
- [x] `npm run dev` funcional
- [x] Crear proyecto en Supabase
- [x] Configurar `.env`
- [x] Crear `supabase.js`
- [x] Probar conexión a Supabase

### En Progreso
- [ ] Crear tabla `verses` con full-text search

### A Hacer
- [ ] Crear tabla `verses` en Supabase
- [ ] Insertar versículo de prueba
- [ ] Implementar búsqueda en tiempo real
- [ ] Configurar i18next
- [ ] Implementar autenticación
- [ ] Desplegar en Vercel
- [ ] Configurar DNS


## CHANGELOG

| Fecha       | Acción                                      | Responsable |
|-------------|---------------------------------------------|-------------|
| 26/10/2025  | Creación de `PROJECT.md` — planificación    | [Tú]        |
| 26/10/2025  | Proyecto `study` creado con Vite + React    | [Tú]        |
| 26/10/2025  | Dependencias instaladas                     | [Tú]        |
| 26/10/2025  | Supabase: proyecto, `.env`, cliente         | [Tú]        |
| 26/10/2025  | Conexión a Supabase verificada              | [Tú]        |