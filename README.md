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
DATABASE_URL=<postgres_url>

EMAIL_SERVER_USER=<email_server_user>
EMAIL_SERVER_PASSWORD=<email_server_pass>
EMAIL_SERVER_HOST=<email_server_host>
EMAIL_SERVER_PORT=<email_server_port>
EMAIL_FROM=<email_from>
```

DATABASE_URL needs to be a postgres db:
```
DATABASE_URL="postgresql://giwuzwpdnrgtzv:d003c6a604bb400ea955c3abd8c16cc98f2d909283c322ebd8e9164b33ccdb75@ec2-54-170-123-247.eu-west-1.compute.amazonaws.com:5432/d6ajekcigbuca9"
```

#### Authentication

The app uses [NextAuth.js](https://next-auth.js.org) for authentication
