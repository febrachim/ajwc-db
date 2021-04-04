import express from 'express';
import { PipelineController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';
import { constraints } from './validation';
import { permissions } from '../user/permissions';

const { wrap } = core.utils;
const { validateParam, apiResponse } = core.middleware;
const routes = express.Router();

routes.get('/pipelines',
  auth(permissions.DEAL_VIEW),
  wrap(PipelineController.viewAll));

routes.get('/pipelines/add',
  auth(permissions.DEAL_ADD),
  wrap(PipelineController.addView));

routes.post('/pipelines/add',
  auth(permissions.DEAL_ADD),
  validateParam(constraints.createPipeline, { type: 'json' }),
  validateParam(constraints.pipelineContact, { type: 'json', check: 'contacts', strict: 'contact' }),
  wrap(PipelineController.add),
  apiResponse());

routes.get('/pipelines/edit/:id([0-9]{1,10})',
  auth(permissions.DEAL_EDIT),
  wrap(PipelineController.editView));

routes.post('/pipelines/edit/:id([0-9]{1,10})',
  auth(permissions.DEAL_EDIT),
  validateParam(constraints.createPipeline, { type: 'json' }),
  validateParam(constraints.pipelineContact, { type: 'json', check: 'contacts', strict: 'contact' }),
  wrap(PipelineController.edit),
  apiResponse());

routes.get('/pipelines/detail/:id([0-9]{1,10})',
  auth(permissions.DEAL_VIEW),
  wrap(PipelineController.detail));

routes.get('/pipelines/delete/:id([0-9]{1,10})',
  auth(permissions.DEAL_DELETE, '/pipelines'),
  wrap(PipelineController.delete));

routes.get('/pipelines/export',
  auth(permissions.DEAL_EXCEL),
  wrap(PipelineController.export));

export default routes;
