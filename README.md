# Trucking TMS App


## Setup

Run the following commands to setup local project

```
npm i
npm run db-push     // Push database scheme
npm run generate    // Generate prisma client models/classes
```

#### Environment variables

Create your own .env file with the following variables:

```
POSTGRES_PRISMA_URL=<postgres_url>

EMAIL_SERVER_USER=<email_server_user>
EMAIL_SERVER_PASSWORD=<email_server_pass>
EMAIL_SERVER_HOST=<email_server_host>
EMAIL_SERVER_PORT=<email_server_port>
EMAIL_FROM=<email_from>
```

POSTGRES_PRISMA_URL needs to be a postgres db

#### Authentication

The app uses [NextAuth.js](https://next-auth.js.org) for authentication
