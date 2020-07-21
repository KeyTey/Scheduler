# Scheduler

## Development

### Server 1

```
$ postgres -D /usr/local/var/postgres
```

### Server 2

After cloning:

```
$ createdb scheduler
$ npm install
```

When starting:

```
$ PORT=8000 npm start
```

When using webpack:

```
$ ./node_modules/.bin/webpack
```

When testing:

```
$ npm run test
```

When closing:

```
$ dropdb scheduler
```

## Deployment

```
$ heroku create
$ heroku addons:create heroku-postgresql:hobby-dev
$ heroku config:set GITHUB_CLIENT_ID="EXAMPLE"
$ heroku config:set GITHUB_CLIENT_SECRET="EXAMPLE"
$ heroku config:set HEROKU_URL="https://example.herokuapp.com"
$ git push heroku master
```
