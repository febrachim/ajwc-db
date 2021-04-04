import 'babel-polyfill';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import flash from 'connect-flash';
import cors from 'cors';
import helmet from 'helmet';
import lusca from 'lusca';
import session from 'express-session';
import responseTime from 'response-time';
import favicon from 'serve-favicon';
import Raven from 'raven';
import config from '../config';
import c from './constants';
import core from './modules/core';
import user from './modules/user';
import master from './modules/master';
import company from './modules/company';
import people from './modules/people';
import pipeline from './modules/pipeline';
import desc from './modules/desc';
import event from './modules/event';
import hiring from './modules/hiring';
import cluster from 'cluster'

const dsn = 'https://e6ae8ab961d14eda8c050b53287f6d91:a69f5cd016734e78be194df11c22caef@sentry.io/296497';
const RedisStore = require('connect-redis')(session);

Raven.config(dsn).install();

const app = express();
app.use(Raven.requestHandler());

process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.log('Unhandled Rejection:', err.stack);
});



app.use(responseTime());
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(config.publicPath, { maxAge: c.ONE_YEAR }));
app.use(favicon(`${config.publicPath}/static/img/favicon.png`));

// setup session middleware
app.set('trust proxy', 1);

app.use(session({
  store: new RedisStore({ ttl: config.cookie_expires, host: config.redishost }),
  secret: config.secret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: config.https, maxAge: config.cookie_expires },
}));

// configure passport middleware
// this must be defined after session middleware
// see: http://passportjs.org/docs#middleware
user.passport.configure(app);

// prevent clickjacking and cross site scripting
// see: https://github.com/krakenjs/lusca
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));

// set default express behavior
// disable x-powered-by signature
// and enable case-sensitive routing
app.set('env', config.env);
app.set('x-powered-by', false);
app.set('case sensitive routing', true);
app.set('views', path.join(__dirname, 'modules'));
app.set('view engine', 'pug');

app.use(flash());
// set locals variables
// to be used in pug
app.use((req, res, next) => {
  const { COUNTRY_VIEW, ROLE_CATEGORY_VIEW, SECTOR_VIEW, PRIORITY_VIEW, RATING_VIEW, CURRENCY_VIEW,
    PROGRESS_STATUS_VIEW, HIRING_STATUS_VIEW, FUNDRAISING_STAGE_VIEW, DEAL_STATUS_VIEW,
    CANDIDATE_STATUS_VIEW } = user.permissions;
  res.locals.flashes = req.flash();
  res.locals.user = req.user || undefined;
  res.locals.permissions = user.permissions;
  // To show master dropdown in sidebar when one of the master is permitted
  res.locals.masters = [COUNTRY_VIEW, ROLE_CATEGORY_VIEW, SECTOR_VIEW, PRIORITY_VIEW, RATING_VIEW,
    CURRENCY_VIEW, PROGRESS_STATUS_VIEW, HIRING_STATUS_VIEW, FUNDRAISING_STAGE_VIEW,
    DEAL_STATUS_VIEW, CANDIDATE_STATUS_VIEW];
  res.locals.userPermissions = req.session.permissions || [];
  next();
});

// configure middleware
app.use(core.middleware.requestLoggerMiddleware());

app.use(core.routes);
app.use(user.routes);
app.use(master.routes);
app.use(company.routes);
app.use(people.routes);
app.use(pipeline.routes);
app.use(desc.routes);
app.use(event.routes);
app.use(hiring.routes);

app.use((req, res) => {
  res.status(404);
  return res.render('core/views/errors/404');
});

app.use(Raven.errorHandler());

app.use(core.middleware.errorFlash());
// eslint-disable-next-line no-unused-vars

export default app;
