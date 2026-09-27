# React + Vite

## Managed schools and classes

Run `supabase/sql/manage_schools_classes.sql` in the Supabase SQL Editor after the existing authentication and student migrations. Then rerun `supabase/sql/admin_set_teacher_password.sql` so the teacher search RPC includes school assignments. Use `/admin` to create schools, manage classes and divisions, and assign teachers to schools. Teachers will see only the catalog for their assigned school; existing records without catalog IDs remain available through the legacy class fallback until they are edited or backfilled.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
