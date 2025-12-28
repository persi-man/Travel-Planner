# Travel Planner Documentation

## Overview

Travel Planner is a full-stack web application designed for creating, managing, and sharing detailed travel itineraries. It allows users to plan trips day-by-day, track budgets, and export plans to professional formats.

## Architecture

### Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Database**: SQLite
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: CSS Modules with a custom Design System (Variables)
- **Export**: `jspdf` (PDF), `xlsx` (Excel)
- **Icons**: Lucide React

### Folder Structure

```
src/
├── app/                 # App Router (Pages & API)
│   ├── api/             # Backend API Routes
│   │   ├── trips/       # Trip CRUD
│   │   └── activities/  # Activity CRUD
│   ├── trips/           # Trip-specific Pages
│   │   ├── [id]/        # Trip Details / Timeline
│   │   └── new/         # Create Trip Form
│   ├── globals.css      # Global Styles & Variables
│   ├── layout.tsx       # Root Layout
│   └── page.tsx         # Home Dashboard
├── lib/
│   └── prisma.ts        # Prisma Client Singleton
└── component/           # (Reserved for reusable UI components)
```

## Features Deep Dive

### 1. Trip Management

- **Create**: Users can create trips with a title, destination, date range, and optional budget/cover image.
- **Logic**: Upon creation, the backend automatically calculates the number of days between start/end dates and pre-populates `Day` records in the database.

### 2. Day-by-Day Planning

- **Visual Timeline**: Each day is displayed as a card containing a list of activities.
- **Activity Types**: Supports various types: Activity, Food, Lodging, and Travel.
- **Cost Tracking**: Each activity can have an associated cost, which aids in budget planning.

### 3. Data Export

- **PDF Generation**: Generates a clean, printable itinerary using `jspdf-autotable`. Includes trip summary and a chronological table of activities.
- **Excel Export**: Exports raw data using `xlsx` (SheetJS) for users who want to manipulate their itinerary data in spreadsheets.

## Database Schema

### `Trip`

| Field       | Type          | Description           |
| ----------- | ------------- | --------------------- |
| id          | String (UUID) | Primary Key           |
| title       | String        | Trip Name             |
| destination | String        | Target Location       |
| startDate   | DateTime      |                       |
| endDate     | DateTime      |                       |
| budget      | Float         | Optional total budget |
| coverImage  | String        | URL for UI visual     |

### `Day`

| Field  | Type          | Description               |
| ------ | ------------- | ------------------------- |
| id     | String (UUID) | Primary Key               |
| date   | DateTime      | Specific date of the trip |
| index  | Int           | Day number (0, 1, 2...)   |
| tripId | String        | FK to Trip                |

### `Activity`

| Field     | Type          | Description                     |
| --------- | ------------- | ------------------------------- |
| id        | String (UUID) | Primary Key                     |
| type      | String        | activity, food, lodging, travel |
| title     | String        | Name of activity                |
| startTime | DateTime      |                                 |
| cost      | Float         |                                 |
| dayId     | String        | FK to Day                       |
