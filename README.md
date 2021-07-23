# Scheduler

## GitHub OAuth Setup

1. Access to [OAuth Apps](https://github.com/settings/developers).
2. Click the [New OAuth App] button.
3. Fill in the fields as follows:

| Attribute | Content |
| - | - |
| Application name | Scheduler |
| Homepage URL | ${SERVICE_URL} |
| Authorization callback URL | ${SERVICE_URL}/auth/github/callback |

4. Click the [Register application] button.

## Development

### DB Server

#### Start

```sh
$ brew services start postgresql
$ createdb scheduler
```

#### Stop

```sh
$ dropdb scheduler
$ brew services stop postgresql
```

### Web Server

#### Setup

```sh
$ npm install
$ export GITHUB_CLIENT_ID="XXXXXXXXXX"
$ export GITHUB_CLIENT_SECRET="XXXXXXXXXX"
$ export SERVICE_URL="http://localhost:8000"
```

#### Start

```sh
$ npm start
```

#### Build

```sh
$ npm run build
```

#### Test

```sh
$ npm run test
```

## Deployment

```sh
$ heroku create
$ heroku addons:create heroku-postgresql:hobby-dev
$ heroku config:set GITHUB_CLIENT_ID="XXXXXXXXXX"
$ heroku config:set GITHUB_CLIENT_SECRET="XXXXXXXXXX"
$ heroku config:set SERVICE_URL="https://XXXXXXXXXX.herokuapp.com"
$ heroku config:set PGSSLMODE=require
$ git push heroku master
```
