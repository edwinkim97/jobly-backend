# Jobly Express Backend

## About

This is the Express backend for Jobly deployed with Heroku.

## [Live Demo](https://edwinkim-demo-jobly.surge.sh/)

# Getting Started on the Development Server

### In your terminal run these commands:

1. clone the repo
2. `cd jobly-backend`
3. `npm install`
4. `psql -f jobly.sql`

#### Create a .env file in the root directory and create this variable (choose your own secret key)
- SECRET_KEY=""

#### Start the server

1. `npm start`

- Runs the app in the development mode.
- You can make requests to [http://localhost:3001](http://localhost:3001) and the 
    app's various endpoints with API Clients such as Insomnia.

### Testing the app
#### To test the entire app:

1. `cd jobly-backend`
2. `npm test`

#### To test a specific folder:

Method 1:
1. `npm test {name_of_test_file}`

Method 2:
1. `cd {specific_folder}`
2. `npm test`

- Tests will run using Jest