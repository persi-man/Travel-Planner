# Quickstart Guide

This guide will help you set up and run the Travel Planner application locally.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 18.17 or higher (Recommended: LTS)
- **npm**: Installed automatically with Node.js
- **Git**: For version control

## Installation

1.  **Clone the repository** (if not already done):

    ```bash
    git clone <repository-url>
    cd travel-planner
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Initialize the Database**:
    This command will create the local SQLite database (`dev.db`) and apply the schema.
    ```bash
    npx prisma db push
    ```

## Running the Application

### Development Mode

To start the development server with hot-reloading:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

To verify the application as it would run in production:

1.  **Build the application**:

    ```bash
    npm run build
    ```

2.  **Start the production server**:
    ```bash
    npm start
    ```

## Common Issues

- **Database Errors**: If you encounter errors related to the database, try running `npx prisma generate` to refresh the Prisma Client.
- **Port In Use**: If port 3000 is occupied, Next.js will automatically try 3001. Check the terminal output for the correct URL.

## Running with Docker

We provide a Docker setup to run the application in a consistent containerized environment.

### Prerequisites

- **Docker** and **Docker Compose** installed.

### Steps

1.  **Start the Container**:

    ```bash
    docker-compose up -d --build
    ```

2.  **Initialize Database (First Time Only)**:
    Since the database is running inside the container (or mapped volume), you need to push the schema:

    ```bash
    docker-compose exec app npx prisma@6 db push
    ```

3.  **Access the App**:
    Open [http://localhost:3000](http://localhost:3000).

4.  **Stop**:
    ```bash
    docker-compose down
    ```
