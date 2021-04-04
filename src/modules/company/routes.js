import express from 'express';
import { CompanyController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';
import { constraints } from './validation';
import { permissions } from '../user/permissions';

const { wrap } = core.utils;
const { validateParam, apiResponse } = core.middleware;
const routes = express.Router();

routes.get('/companies',
  auth(permissions.COMPANY_VIEW),
  wrap(CompanyController.viewAll));

routes.get('/api/companies',
  auth(),
  wrap(CompanyController.listCompany),
  apiResponse());

routes.get('/companies/add',
  auth(permissions.COMPANY_ADD),
  wrap(CompanyController.addView));

routes.post('/companies/add',
  auth(permissions.COMPANY_ADD),
  validateParam(constraints.createCompany, { type: 'json' }),
  wrap(CompanyController.add),
  apiResponse());

routes.get('/companies/edit/:id([0-9]{1,10})',
  auth(permissions.COMPANY_EDIT),
  wrap(CompanyController.editView));

routes.post('/companies/edit/:id([0-9]{1,10})',
  auth(permissions.COMPANY_EDIT),
  validateParam(constraints.createCompany, { type: 'json' }),
  wrap(CompanyController.edit),
  apiResponse());

routes.get('/companies/detail/:id([0-9]{1,10})',
  auth(permissions.COMPANY_VIEW),
  wrap(CompanyController.detail));

routes.get('/companies/delete/:id([0-9]{1,10})',
  auth(permissions.COMPANY_DELETE, '/companies'),
  wrap(CompanyController.delete));

routes.get('/companies/export',
  auth(permissions.COMPANY_EXCEL),
  wrap(CompanyController.export));

export default routes;
