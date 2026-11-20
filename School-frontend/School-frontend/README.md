# React + Vite

## Learning Hub (LMS and e-learning)

Administrators and teachers can open **Learning Hub** from the dashboard to create courses for a class, add lesson notes, and share YouTube/Vimeo videos or reading links. Publish a course when its lessons are ready; only students in the selected class will see it. Students can sign in from the regular login page, open **My Learning**, and mark lessons complete to track their progress.

Administrators can create student learning accounts from the Student learning accounts panel in Learning Hub. Each account is linked to an active student record; share the username and initial password with the student securely.

Teachers can create course exams with automatically marked multiple-choice and true/false questions, set the number of attempts and an optional time limit, and publish exams to the course class. Students can complete exams, resume saved attempts, and view their marked reports. Reports can be printed or downloaded as PDFs; teachers can review submitted results from the course exam panel.

## Attendance photo verification

The Photo check compares the stored profile photo with a webcam capture locally in the browser. A sufficiently strong one-to-one face match immediately saves the person as Present for the selected date. Webcam captures and face descriptors are not uploaded or stored. Automated matching requires a profile photo and a modern browser with camera access over HTTPS or localhost; it is not liveness-proof and should not replace manual attendance review when a match fails.

## Expense tracking

Administrators and bursars can record, edit, and remove school expenses from **Expenses** in the dashboard. The finance summary and dashboard show the all-time available balance, calculated as collected school and canteen fees minus recorded expenses and payroll marked as paid. Outstanding fee debt and unpaid payroll are not counted as available cash. Payroll is included automatically, so do not record it again as a manual expense.

## Class sections

Administrators can add a section or description when creating a class. The section becomes part of the class identity used for enrollment, attendance, and other class lists; for example, grade **Basic 1** with section **Gold** is stored as **BASIC 1 GOLD**, separately from **BASIC 1 DIAMOND**.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
