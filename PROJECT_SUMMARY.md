# Lumina LMS - Project Summary

## 🚀 Overview
Lumina LMS is a state-of-the-art, SaaS-ready Learning Management System designed for corporate training and educational institutions. It features a multi-tenant architecture, allowing multiple companies to manage their own employees and courses in complete isolation.

## 🛠️ Technology Stack
### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Validation**: Pydantic models
- **Auth**: JWT-based authentication with role-based access control (Admin, HR, Employee)
- **AI Integration**: Custom services for quiz generation and content summarization

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS & Shadcn UI
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: React Context API (AuthContext)

## 🏗️ Core Architecture & Features

### 1. Multi-Tenant SaaS Engine
- **Company Management**: Super Admin controls companies, billing, and global settings.
- **Data Isolation**: All courses, users, and progress records are scoped to a `company_id`.
- **Onboarding Flow**: Integrated payment simulation and company registration.

### 2. Intelligent Content Management
- **Hierarchical Structure**: Courses -> Modules -> (Videos, Notes, Quizzes, Assignments).
- **Bulk Imports**: Support for bulk quiz creation via JSON/Excel-like structures.
- **Modular Design**: Easy to add or remove content types within a module.

### 3. Advanced Quiz System
- **Flexible Questions**: Supports MCQ, Fill-in-the-blanks, Short Answer, and Coding questions.
- **Granular Review**: Every user answer is persisted to the `user_answers` table for detailed performance analysis.
- **Mastery Quizzes**: Automated grading with percentage-based passing requirements.
- **Review UI**: Post-quiz breakdown showing "Your Answer" vs "Correct Answer" with detailed explanations.

### 4. Progress & Analytics
- **Granular Tracking**: Tracks video watch time, notes viewed, and quiz attempts.
- **Module Completion**: Automatically marks modules as finished when all activities are completed.
- **Course Certification**: Enforces module completion before allowing a user to mark a course as "Certified".
- **Dashboards**: Dedicated interfaces for Admin (Overview), HR (Employee Progress), and Employees (My Learning).

## 💎 Design Philosophy
- **Rich Aesthetics**: Dark mode by default with glassmorphism effects and vibrant gradients.
- **Interactive UX**: Smooth micro-animations for card hovers, page transitions, and status updates.
- **Premium Components**: Custom-styled badges, cards, and buttons following high-end SaaS design patterns.

## 📈 Recent Improvements
- **Quiz Refactor**: Migrated `correct_answer` to `TEXT` and added a dedicated `UserAnswer` table for better reporting.
- **Stabilization**: Fixed proxy issues and backend `NameError` crashes with robust error handling.
- **Flow Control**: Implemented conditional course completion buttons on the dashboard to ensure content mastery.
- **UI Polish**: Redesigned the module management and student dashboard for a "Stripe-like" premium experience.

## 📂 Directory Structure
- `/backend`: FastAPI source code, models, and routes.
- `/frontend`: Next.js application, components, and styles.
- `/database`: Schema definitions and migration scripts.
- `/uploads`: Local storage for course materials and user submissions.

---
*Generated on: 2026-04-29*
