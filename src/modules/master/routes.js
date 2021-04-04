import express from 'express';
import { MasterController } from './controller';
import core from '../core';
import { auth } from '../user/middleware';
import { constraints } from './validation';
import { permissions } from '../user/permissions';

const { wrap } = core.utils;
const { validateParam, apiResponse } = core.middleware;
const routes = express.Router();

routes.get('/sectors/add',
  auth(permissions.SECTOR_ADD),
  wrap(MasterController.createSectorView));

routes.post('/sectors/add',
  auth(permissions.SECTOR_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createSector));

routes.get('/sectors',
  auth(permissions.SECTOR_VIEW),
  wrap(MasterController.viewSectors));

routes.get('/sectors/edit/:id([0-9]{1,10})',
  auth(permissions.SECTOR_EDIT),
  wrap(MasterController.editSectorView));

routes.post('/sectors/edit/:id([0-9]{1,10})',
  auth(permissions.SECTOR_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editSector));

routes.get('/sectors/delete/:id([0-9]{1,10})',
  auth(permissions.SECTOR_DELETE),
  wrap(MasterController.deleteSector));

routes.get('/countries/add',
  auth(permissions.COUNTRY_ADD),
  wrap(MasterController.createCountriesView));

routes.post('/countries/add',
  auth(permissions.COUNTRY_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createCountries));

routes.get('/stages/add',
  auth(permissions.FUNDRAISING_STAGE_ADD),
  wrap(MasterController.createStagesView));

routes.post('/stages/add',
  auth(permissions.FUNDRAISING_STAGE_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createStages));

routes.get('/actions/add',
  auth(permissions.PROGRESS_STATUS_ADD),
  wrap(MasterController.createActionsView));

routes.post('/actions/add',
  auth(permissions.PROGRESS_STATUS_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createActions));

routes.get('/countries',
  auth(permissions.COUNTRY_VIEW),
  wrap(MasterController.viewCountries));

routes.get('/stages',
  auth(permissions.FUNDRAISING_STAGE_VIEW),
  wrap(MasterController.viewStages));

routes.get('/actions',
  auth(permissions.PROGRESS_STATUS_VIEW),
  wrap(MasterController.viewActions));

routes.get('/countries/edit/:id([0-9]{1,10})',
  auth(permissions.COUNTRY_EDIT),
  wrap(MasterController.editCountryView));

routes.post('/countries/edit/:id([0-9]{1,10})',
  auth(permissions.COUNTRY_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editCountry));

routes.get('/stages/edit/:id([0-9]{1,10})',
  auth(permissions.FUNDRAISING_STAGE_EDIT),
  wrap(MasterController.editStageView));

routes.post('/stages/edit/:id([0-9]{1,10})',
  auth(permissions.FUNDRAISING_STAGE_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editStage));

routes.get('/actions/edit/:id([0-9]{1,10})',
  auth(permissions.PROGRESS_STATUS_EDIT),
  wrap(MasterController.editActionView));

routes.post('/actions/edit/:id([0-9]{1,10})',
  auth(permissions.PROGRESS_STATUS_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editAction));

routes.get('/countries/delete/:id([0-9]{1,10})',
  auth(permissions.COUNTRY_DELETE),
  wrap(MasterController.deleteCountry));

routes.get('/stages/delete/:id([0-9]{1,10})',
  auth(permissions.FUNDRAISING_STAGE_DELETE),
  wrap(MasterController.deleteStage));

routes.get('/actions/delete/:id([0-9]{1,10})',
  auth(permissions.PROGRESS_STATUS_DELETE),
  wrap(MasterController.deleteAction));

routes.get('/role-categories/add',
  auth(permissions.ROLE_CATEGORY_ADD),
  MasterController.createCategoryView);

routes.post('/role-categories/add',
  auth(permissions.ROLE_CATEGORY_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createCategory));

routes.get('/role-categories',
  auth(permissions.ROLE_CATEGORY_VIEW),
  wrap(MasterController.viewCategories));

routes.get('/role-categories/edit/:id([0-9]{1,10})',
  auth(permissions.ROLE_CATEGORY_EDIT),
  wrap(MasterController.editCategoryView));

routes.post('/role-categories/edit/:id([0-9]{1,10})',
  auth(permissions.ROLE_CATEGORY_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editCategory));

routes.get('/role-categories/delete/:id([0-9]{1,10})',
  auth(permissions.ROLE_CATEGORY_DELETE),
  wrap(MasterController.deleteCategory));

routes.get('/hiring-statuses/add',
  auth(permissions.HIRING_STATUS_ADD),
  wrap(MasterController.createHiringStatusView));

routes.get('/candidate-statuses/add',
  auth(permissions.CANDIDATE_STATUS_ADD),
  wrap(MasterController.createHiringStatusView));

routes.post('/hiring-statuses/add',
  auth(permissions.HIRING_STATUS_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createHiringStatus));

routes.post('/candidate-statuses/add',
  auth(permissions.CANDIDATE_STATUS_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createHiringStatus));

routes.get('/hiring-statuses/edit/:id([0-9]{1,10})',
  auth(permissions.HIRING_STATUS_EDIT),
  wrap(MasterController.editHiringStatusView));

routes.get('/candidate-statuses/edit/:id([0-9]{1,10})',
  auth(permissions.CANDIDATE_STATUS_EDIT),
  wrap(MasterController.editHiringStatusView));

routes.post('/hiring-statuses/edit/:id([0-9]{1,10})',
  auth(permissions.HIRING_STATUS_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editHiringStatus));

routes.post('/candidate-statuses/edit/:id([0-9]{1,10})',
  auth(permissions.CANDIDATE_STATUS_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editHiringStatus));

routes.get('/hiring-statuses',
  auth(permissions.HIRING_STATUS_VIEW),
  wrap(MasterController.viewHiringStatus));

routes.get('/candidate-statuses',
  auth(permissions.CANDIDATE_STATUS_VIEW),
  wrap(MasterController.viewHiringStatus));

routes.get('/hiring-statuses/delete/:id([0-9]{1,10})',
  auth(permissions.HIRING_STATUS_DELETE),
  wrap(MasterController.deleteHiringStatus));

routes.get('/candidate-statuses/delete/:id([0-9]{1,10})',
  auth(permissions.CANDIDATE_STATUS_DELETE),
  wrap(MasterController.deleteHiringStatus));

routes.get('/ratings/add',
  auth(permissions.RATING_ADD),
  wrap(MasterController.createPipelineExtraView));

routes.get('/pipeline-statuses/add',
  auth(permissions.DEAL_STATUS_ADD),
  wrap(MasterController.createPipelineExtraView));

routes.get('/priorities/add',
  auth(permissions.PRIORITY_ADD),
  wrap(MasterController.createPipelineExtraView));

routes.get('/currencies/add',
  auth(permissions.CURRENCY_ADD),
  wrap(MasterController.createPipelineExtraView));

routes.post('/ratings/add',
  auth(permissions.RATING_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createPipelineExtra));

routes.post('/pipeline-statuses/add',
  auth(permissions.DEAL_STATUS_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createPipelineExtra));

routes.post('/priorities/add',
  auth(permissions.PRIORITY_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createPipelineExtra));

routes.post('/currencies/add',
  auth(permissions.CURRENCY_ADD),
  validateParam(constraints.name),
  wrap(MasterController.createPipelineExtra));

routes.get('/ratings/edit/:id([0-9]{1,10})',
  auth(permissions.RATING_EDIT),
  wrap(MasterController.editPipelineExtraView));

routes.get('/pipeline-statuses/edit/:id([0-9]{1,10})',
  auth(permissions.DEAL_STATUS_EDIT),
  wrap(MasterController.editPipelineExtraView));

routes.get('/priorities/edit/:id([0-9]{1,10})',
  auth(permissions.PRIORITY_EDIT),
  wrap(MasterController.editPipelineExtraView));

routes.get('/currencies/edit/:id([0-9]{1,10})',
  auth(permissions.CURRENCY_EDIT),
  wrap(MasterController.editPipelineExtraView));

routes.post('/ratings/edit/:id([0-9]{1,10})',
  auth(permissions.RATING_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editPipelineExtra));

routes.post('/pipeline-statuses/edit/:id([0-9]{1,10})',
  auth(permissions.DEAL_STATUS_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editPipelineExtra));

routes.post('/priorities/edit/:id([0-9]{1,10})',
  auth(permissions.PRIORITY_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editPipelineExtra));

routes.post('/currencies/edit/:id([0-9]{1,10})',
  auth(permissions.CURRENCY_EDIT),
  validateParam(constraints.name),
  wrap(MasterController.editPipelineExtra));

routes.get('/ratings',
  auth(permissions.RATING_VIEW),
  wrap(MasterController.viewPipelineExtra));

routes.get('/pipeline-statuses',
  auth(permissions.DEAL_STATUS_VIEW),
  wrap(MasterController.viewPipelineExtra));

routes.get('/priorities',
  auth(permissions.PRIORITY_VIEW),
  wrap(MasterController.viewPipelineExtra));

routes.get('/currencies',
  auth(permissions.CURRENCY_VIEW),
  wrap(MasterController.viewPipelineExtra));

routes.get('/ratings/delete/:id([0-9]{1,10})',
  auth(permissions.RATING_DELETE),
  wrap(MasterController.deletePipelineExtra));

routes.get('/pipeline-statuses/delete/:id([0-9]{1,10})',
  auth(permissions.DEAL_STATUS_DELETE),
  wrap(MasterController.deletePipelineExtra));

routes.get('/priorities/delete/:id([0-9]{1,10})',
  auth(permissions.PRIORITY_DELETE),
  wrap(MasterController.deletePipelineExtra));

routes.get('/currencies/delete/:id([0-9]{1,10})',
  auth(permissions.CURRENCY_DELETE),
  wrap(MasterController.deletePipelineExtra));

routes.get('/api/sectors/:id([0-9]{1,10})',
  auth(),
  wrap(MasterController.getSubsectors),
  apiResponse());

routes.get('/api/countries',
  auth(),
  wrap(MasterController.getCountries),
  apiResponse());

routes.post('/api/edit-order',
  auth(),
  wrap(MasterController.changeOrder),
  apiResponse());

routes.get('/api/:id([0-9]{1,10})/children',
  auth(),
  wrap(MasterController.getChildren),
  apiResponse());

export default routes;
