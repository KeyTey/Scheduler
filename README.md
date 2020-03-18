# Scheduler

https://schedulist.herokuapp.com

## Development

### Server 1

```
$ npm install
$ PORT=8000 npm start
```

### Server 2

```
$ postgres -D /usr/local/var/postgres
```

### Server 3

Create a bundle using webpack:
```
$ ./node_modules/.bin/webpack
```

Create a new PostgreSQL database:
```
$ createdb scheduler
```

Delete a PostgreSQL database:
```
$ dropdb scheduler
```

## Deployment

```
$ heroku create
$ heroku addons:create heroku-postgresql:hobby-dev
$ heroku config:set GITHUB_CLIENT_ID="<YOUR CLIENT ID>"
$ heroku config:set GITHUB_CLIENT_SECRET="<YOUR CLIENT SECRET>"
$ heroku config:set HEROKU_URL="https://schedulist.herokuapp.com"
$ git push heroku master
```
