import express from 'express';
import { PeopleController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';
import { constraints } from './validation';
import { permissions } from '../user/permissions';

const { wrap } = core.utils;
const { validateParam, apiResponse } = core.middleware;
const routes = express.Router();

routes.get('/people',
  auth(permissions.PEOPLE_VIEW),
  wrap(PeopleController.viewAll('People')));

routes.get('/invitees',
  auth(permissions.EVENT_VIEW),
  wrap(PeopleController.viewAll('Invitee')));

routes.get('/api/companies/:id([0-9]{1,10})/people',
  auth(),
  wrap(PeopleController.listPeople),
  apiResponse());

routes.get('/api/people',
  auth(),
  wrap(PeopleController.listPeople),
  apiResponse());

routes.get('/people/add',
  auth(permissions.PEOPLE_ADD),
  wrap(PeopleController.addView));

routes.post('/people/add',
  auth(permissions.PEOPLE_ADD),
  validateParam(constraints.createPeople, { type: 'json' }),
  validateParam(constraints.createPeopleCompany, { type: 'json', check: 'companies' }),
  wrap(PeopleController.add),
  apiResponse());

routes.get('/people/edit/:id([0-9]{1,10})',
  auth(permissions.PEOPLE_EDIT),
  wrap(PeopleController.editView));

routes.post('/people/edit/:id([0-9]{1,10})',
  auth(permissions.PEOPLE_EDIT),
  validateParam(constraints.createPeople, { type: 'json' }),
  validateParam(constraints.createPeopleCompany, { type: 'json', check: 'companies' }),
  wrap(PeopleController.edit),
  apiResponse());

routes.get('/people/detail/:id([0-9]{1,10})',
  auth(permissions.PEOPLE_VIEW),
  wrap(PeopleController.detail));

routes.get('/people/delete/:id([0-9]{1,10})',
  auth(permissions.PEOPLE_DELETE, '/people'),
  wrap(PeopleController.delete));

routes.get('/people/export',
  auth(permissions.PEOPLE_EXCEL),
  wrap(PeopleController.export('people')));

routes.get('/invitees/export',
  auth(permissions.HIRING_EXCEL),
  wrap(PeopleController.export('invitees')));

export default routes;
