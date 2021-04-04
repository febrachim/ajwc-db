import express from 'express';
import { EventController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';
import { constraints } from './validation';
import { permissions } from '../user/permissions';

const { wrap } = core.utils;
const { validateParam, apiResponse } = core.middleware;
const routes = express.Router();

routes.get('/events',
  auth(permissions.EVENT_VIEW),
  wrap(EventController.viewAll));

routes.get('/api/events',
  auth(),
  wrap(EventController.listEvents),
  apiResponse());

routes.get('/events/add',
  auth(permissions.EVENT_ADD),
  wrap(EventController.addView));

routes.post('/events/add',
  auth(permissions.EVENT_ADD),
  validateParam(constraints.createEvent, { type: 'json' }),
  wrap(EventController.add),
  apiResponse());

routes.get('/events/edit/:id([0-9]{1,10})',
  auth(permissions.EVENT_EDIT),
  wrap(EventController.editView));

routes.post('/events/edit/:id([0-9]{1,10})',
  auth(permissions.EVENT_EDIT),
  validateParam(constraints.createEvent, { type: 'json' }),
  wrap(EventController.edit),
  apiResponse());

routes.get('/events/detail/:id([0-9]{1,10})',
  auth(permissions.EVENT_VIEW),
  wrap(EventController.detail));

routes.get('/events/delete/:id([0-9]{1,10})',
  auth(permissions.EVENT_DELETE, '/events'),
  wrap(EventController.delete));

routes.get('/events/export',
  auth(permissions.EVENT_EXCEL),
  wrap(EventController.export));

export default routes;
