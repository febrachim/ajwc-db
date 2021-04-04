import express from 'express';
import { HiringController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';
import { constraints } from './validation';
import { permissions } from '../user/permissions';

const { wrap } = core.utils;
const { validateParam, apiResponse } = core.middleware;
const routes = express.Router();

routes.get('/api/companies/:id([0-9]{1,10})/jobs',
  auth(),
  wrap(HiringController.listJobs),
  apiResponse());

routes.get('/api/roles',
  auth(),
  wrap(HiringController.getAllRoles),
  apiResponse())

routes.get('/hirings/add',
  auth(permissions.HIRING_ADD),
  wrap(HiringController.addOpeningView));

routes.post('/hirings/add',
  auth(permissions.HIRING_ADD),
  validateParam(constraints.job, { type: 'json' }),
  wrap(HiringController.addOpening),
  apiResponse());

routes.get('/candidates/edit/:id([0-9]{1,10})',
  auth(permissions.HIRING_EDIT),
  wrap(HiringController.editCandidateView));

routes.post('/candidates/edit/:id([0-9]{1,10})',
  auth(permissions.HIRING_EDIT),
  validateParam(constraints.candidate, { type: 'json' }),
  wrap(HiringController.editCandidate),
  apiResponse());

routes.get('/hirings/edit',
  auth(permissions.HIRING_EDIT),
  wrap(HiringController.editHiringView));

routes.post('/hirings/edit',
  auth(permissions.HIRING_EDIT),
  validateParam(constraints.job, { type: 'json' }),
  wrap(HiringController.editHiring),
  apiResponse());

routes.get('/hirings/detail',
  auth(permissions.HIRING_VIEW),
  wrap(HiringController.detailOpening));

routes.get('/candidates/detail/:id([0-9]{1,10})',
  auth(permissions.HIRING_VIEW),
  wrap(HiringController.detailCandidate));

routes.get('/hirings',
  auth(permissions.HIRING_VIEW),
  wrap(HiringController.viewAllOpenings));

routes.get('/candidates',
  auth(permissions.HIRING_VIEW),
  wrap(HiringController.viewAllCandidates));

routes.get('/hirings/delete',
  auth(permissions.HIRING_DELETE, '/hirings'),
  wrap(HiringController.deleteOpening));

routes.get('/candidates/delete/:id([0-9]{1,10})',
  auth(permissions.HIRING_DELETE, '/candidates'),
  wrap(HiringController.deleteCandidate));

routes.get('/hirings/export',
  auth(permissions.HIRING_EXCEL),
  wrap(HiringController.openingExport));

routes.get('/candidates/export',
  auth(permissions.HIRING_EXCEL),
  wrap(HiringController.candidateExport));

export default routes;
