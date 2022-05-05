# Jobly Express Backend

## About

This is the Express backend for Jobly deployed with Heroku.

## [Live Demo]()

# Getting Started on the Development Server

### In your terminal run these commands:

1. clone the repo
2. `cd jobly-backend`
3. `cd express-backend`
3. `npm install`
4. `psql -f jobly.sql`

#### Create a .env file in the root directory and create this variable (choose your own secret key)
- SECRET_KEY=""

#### Start the server
1. `npm start`

- Runs the app in the development mode.
- You can make requests to [http://localhost:3001](http://localhost:3001) and the 
    app's various endpoints with API Clients such as Insomnia.

#### Run Tests
1. `npm test`

- Tests will run using Jest